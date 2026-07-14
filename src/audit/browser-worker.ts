import { chromium, type Browser, type ElementHandle, type Page } from "playwright";
import path from "node:path";
import { classifyElement } from "./safe-actions";
import type {
  ActionResultRecord,
  BrokenImageRecord,
  BrowserSessionResult,
  ConsoleMessageRecord,
  DeadLinkCheckRecord,
  DiscoveredElement,
  FailedRequestRecord,
  HttpErrorRecord,
  NavigationRecord,
  PageErrorRecord,
} from "@/shared/types";
import { AuditError } from "@/shared/errors";

export interface BrowserWorkerOptions {
  targetUrl: string;
  runDir: string;
  screenshotsDir: string;
  maxActions: number;
  maxDeadLinkChecks: number;
  perActionTimeoutMs: number;
  navigationTimeoutMs: number;
  runDeadlineAt: number;
  onEvent?: (type: string, data: Record<string, unknown>) => void;
  onStatus?: (status: "DISCOVERING_UI" | "EXECUTING_CHECKS") => void;
}

function toRelative(runDir: string, absolutePath: string): string {
  return path.relative(runDir, absolutePath).split(path.sep).join("/");
}

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [role="link"], [role="menuitem"], [role="switch"], [role="checkbox"], [role="tab"]';

const DESCRIBE_ELEMENT_FN = `(el) => {
  function accessibleName(node) {
    const aria = node.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const labelledBy = node.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy
        .split(/\\s+/)
        .map((id) => document.getElementById(id) ? document.getElementById(id).textContent : '')
        .join(' ')
        .trim();
      if (text) return text;
    }
    if (node.tagName === 'IMG') return node.getAttribute('alt') || '';
    if ('value' in node && node.type && ['submit', 'button'].includes(node.type) && node.value) {
      return node.value;
    }
    const text = (node.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 160);
    if (text) return text;
    return node.getAttribute('title') || node.getAttribute('placeholder') || '';
  }

  function buildSelector(node) {
    if (node.id) return '#' + CSS.escape(node.id);
    const path = [];
    let current = node;
    while (current && current.nodeType === 1 && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children).filter(
          (s) => s.tagName === current.tagName,
        );
        if (siblings.length > 1) {
          selector += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return 'body > ' + path.join(' > ');
  }

  const rect = el.getBoundingClientRect();
  return {
    selector: buildSelector(el),
    tagName: el.tagName.toLowerCase(),
    role: el.getAttribute('role'),
    accessibleName: accessibleName(el),
    text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 160),
    elementType: el.getAttribute('type') || null,
    href: el.tagName === 'A' ? el.href : undefined,
    hasSize: rect.width > 0 && rect.height > 0,
  };
}`;

async function discoverElements(page: Page): Promise<{ handle: ElementHandle; descriptor: DiscoveredElement }[]> {
  const handles = await page.$$(INTERACTIVE_SELECTOR);
  const discovered: { handle: ElementHandle; descriptor: DiscoveredElement }[] = [];

  for (const handle of handles) {
    try {
      const [visible, enabled, raw] = await Promise.all([
        handle.isVisible(),
        handle.isEnabled().catch(() => true),
        handle.evaluate(new Function("el", `return (${DESCRIBE_ELEMENT_FN})(el)`) as (el: Element) => unknown),
      ]);
      const descriptorRaw = raw as Omit<DiscoveredElement, "href"> & { hasSize: boolean; href?: string };
      if (!visible || !enabled || !descriptorRaw.hasSize) continue;

      discovered.push({
        handle,
        descriptor: {
          selector: descriptorRaw.selector,
          tagName: descriptorRaw.tagName,
          role: descriptorRaw.role,
          accessibleName: descriptorRaw.accessibleName,
          elementType: descriptorRaw.elementType,
          text: descriptorRaw.text,
          href: descriptorRaw.href,
        },
      });
    } catch {
      // Element detached or not evaluable; skip it rather than fail the whole discovery pass.
    }
  }

  return discovered;
}

async function checkBrokenImages(page: Page, pageUrl: string): Promise<BrokenImageRecord[]> {
  const raw = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("img")).map((img) => ({
      src: img.src,
      broken: img.complete && img.naturalWidth === 0 && img.src.length > 0,
      selector: img.id ? `#${img.id}` : `img[src="${img.getAttribute("src") ?? ""}"]`,
    }));
  });

  const now = new Date().toISOString();
  return raw
    .filter((r) => r.broken)
    .map((r) => ({ src: r.src, selector: r.selector, pageUrl, timestamp: now }));
}

async function checkDeadLinks(
  page: Page,
  elements: DiscoveredElement[],
  pageUrl: string,
  limit: number,
): Promise<DeadLinkCheckRecord[]> {
  const results: DeadLinkCheckRecord[] = [];
  const seen = new Set<string>();
  const candidates = elements.filter((el) => {
    if (el.tagName !== "a" || !el.href) return false;
    try {
      const url = new URL(el.href, pageUrl);
      if (!["http:", "https:"].includes(url.protocol)) return false;
      if (seen.has(url.toString())) return false;
      seen.add(url.toString());
      return true;
    } catch {
      return false;
    }
  });

  for (const el of candidates.slice(0, limit)) {
    const now = new Date().toISOString();
    try {
      const response = await page.context().request.get(el.href as string, {
        timeout: 8000,
        failOnStatusCode: false,
      });
      results.push({
        href: el.href as string,
        selector: el.selector,
        status: response.status(),
        pageUrl,
        timestamp: now,
      });
    } catch (err) {
      results.push({
        href: el.href as string,
        selector: el.selector,
        status: null,
        error: (err as Error).message,
        pageUrl,
        timestamp: now,
      });
    }
  }

  return results;
}

async function observeAction(
  page: Page,
  handle: ElementHandle,
  perActionTimeoutMs: number,
): Promise<{ effectObserved: boolean; effectDescription: string; urlAfter: string; error?: string }> {
  const urlBefore = page.url();

  try {
    await page.evaluate(() => {
      const w = window as unknown as { __auditMutations: number; __auditObserver?: MutationObserver };
      w.__auditMutations = 0;
      w.__auditObserver?.disconnect();
      w.__auditObserver = new MutationObserver((mutations) => {
        w.__auditMutations += mutations.length;
      });
      w.__auditObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    });
  } catch {
    // page may already be navigating; continue best-effort
  }

  let dialogAppeared = false;
  const dialogListener = async (dialog: import("playwright").Dialog) => {
    dialogAppeared = true;
    try {
      await dialog.dismiss();
    } catch {
      /* ignore */
    }
  };
  page.on("dialog", dialogListener);

  let dispatchError: string | undefined;
  try {
    await handle.click({ timeout: perActionTimeoutMs });
  } catch (err) {
    dispatchError = (err as Error).message;
  }

  await page.waitForTimeout(600).catch(() => undefined);

  let mutations = 0;
  try {
    mutations = await page.evaluate(() => {
      const w = window as unknown as { __auditMutations?: number };
      return w.__auditMutations ?? 0;
    });
  } catch {
    mutations = 0;
  }

  page.off("dialog", dialogListener);

  const urlAfter = page.url();
  const urlChanged = urlAfter !== urlBefore;
  const effectObserved = urlChanged || mutations > 0 || dialogAppeared;

  const reasons: string[] = [];
  if (urlChanged) reasons.push(`URL changed to ${urlAfter}`);
  if (mutations > 0) reasons.push(`${mutations} DOM mutation(s) observed`);
  if (dialogAppeared) reasons.push("a browser dialog appeared");
  if (!effectObserved) reasons.push("no DOM mutation, navigation or dialog was observed");

  return {
    effectObserved,
    effectDescription: reasons.join("; "),
    urlAfter,
    error: dispatchError,
  };
}

export async function runBrowserSession(options: BrowserWorkerOptions): Promise<BrowserSessionResult> {
  const consoleMessages: ConsoleMessageRecord[] = [];
  const pageErrors: PageErrorRecord[] = [];
  const failedRequests: FailedRequestRecord[] = [];
  const httpErrors: HttpErrorRecord[] = [];
  const screenshots: { name: string; path: string }[] = [];

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    throw new AuditError("BROWSER_LAUNCH_FAILED", `Failed to launch Chromium: ${(err as Error).message}`, {
      cause: err,
    });
  }

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.setDefaultTimeout(options.perActionTimeoutMs);

    let currentUrl = options.targetUrl;
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        const record: ConsoleMessageRecord = {
          level: type,
          text: msg.text(),
          location: msg.location()?.url,
          pageUrl: currentUrl,
          timestamp: new Date().toISOString(),
        };
        consoleMessages.push(record);
        options.onEvent?.("console-message", { ...record });
      }
    });

    page.on("pageerror", (error) => {
      const record: PageErrorRecord = {
        message: error.message,
        stack: error.stack,
        pageUrl: currentUrl,
        timestamp: new Date().toISOString(),
      };
      pageErrors.push(record);
      options.onEvent?.("page-error", { ...record });
    });

    page.on("requestfailed", (request) => {
      const record: FailedRequestRecord = {
        url: request.url(),
        method: request.method(),
        failureText: request.failure()?.errorText ?? "unknown failure",
        pageUrl: currentUrl,
        timestamp: new Date().toISOString(),
      };
      failedRequests.push(record);
      options.onEvent?.("request-failed", { ...record });
    });

    page.on("response", (response) => {
      if (response.status() >= 400) {
        const record: HttpErrorRecord = {
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          statusText: response.statusText(),
          pageUrl: currentUrl,
          timestamp: new Date().toISOString(),
        };
        httpErrors.push(record);
        options.onEvent?.("response-received", { ...record });
      }
    });

    let navigation: NavigationRecord;
    try {
      await page.goto(options.targetUrl, {
        timeout: options.navigationTimeoutMs,
        waitUntil: "load",
      });
      await page
        .waitForLoadState("networkidle", { timeout: Math.min(8000, options.navigationTimeoutMs) })
        .catch(() => undefined);
      currentUrl = page.url();
      navigation = {
        requestedUrl: options.targetUrl,
        finalUrl: currentUrl,
        title: await page.title(),
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw new AuditError("NAVIGATION_FAILED", `Failed to open ${options.targetUrl}: ${(err as Error).message}`, {
        cause: err,
      });
    }

    options.onEvent?.("page-opened", { ...navigation });

    const initialScreenshotPath = path.join(options.screenshotsDir, "initial.png");
    await page.screenshot({ path: initialScreenshotPath });
    const initialScreenshotRelative = toRelative(options.runDir, initialScreenshotPath);
    screenshots.push({ name: "initial", path: initialScreenshotRelative });
    options.onEvent?.("screenshot-captured", { name: "initial", path: initialScreenshotRelative });

    options.onStatus?.("DISCOVERING_UI");
    const brokenImages = await checkBrokenImages(page, currentUrl);

    const discovered = await discoverElements(page);
    const discoveredElements = discovered.map((d) => d.descriptor);
    for (const el of discoveredElements) {
      options.onEvent?.("element-discovered", { ...el });
    }

    const deadLinkChecks = await checkDeadLinks(
      page,
      discoveredElements,
      currentUrl,
      options.maxDeadLinkChecks,
    );

    options.onStatus?.("EXECUTING_CHECKS");
    const actionResults: ActionResultRecord[] = [];
    let actionsDispatched = 0;
    let truncatedByLimit = false;

    for (const { handle, descriptor } of discovered) {
      if (descriptor.tagName === "a") continue; // links are covered by the deterministic dead-link check
      if (actionsDispatched >= options.maxActions) {
        truncatedByLimit = true;
        break;
      }
      if (Date.now() >= options.runDeadlineAt) {
        truncatedByLimit = true;
        options.onEvent?.("action-skipped", { element: descriptor, reason: "run deadline reached" });
        break;
      }

      const { classification, reason } = classifyElement(descriptor);
      if (classification !== "safe") {
        options.onEvent?.("action-skipped", { element: descriptor, classification, reason });
        actionResults.push({
          element: descriptor,
          classification,
          reason,
          dispatched: false,
          effectObserved: false,
          effectDescription: "Not actioned: classified as " + classification + ".",
          urlBefore: currentUrl,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      const actionIndex = actionsDispatched + 1;
      const urlBefore = page.url();
      const beforePath = path.join(options.screenshotsDir, `action-${actionIndex}-before.png`);
      await page.screenshot({ path: beforePath }).catch(() => undefined);

      options.onEvent?.("action-attempted", { element: descriptor, index: actionIndex });
      const outcome = await observeAction(page, handle, options.perActionTimeoutMs);
      currentUrl = page.url();

      const afterPath = path.join(options.screenshotsDir, `action-${actionIndex}-after.png`);
      await page.screenshot({ path: afterPath }).catch(() => undefined);
      const beforeRelative = toRelative(options.runDir, beforePath);
      const afterRelative = toRelative(options.runDir, afterPath);
      screenshots.push({ name: `action-${actionIndex}-before`, path: beforeRelative });
      screenshots.push({ name: `action-${actionIndex}-after`, path: afterRelative });

      const record: ActionResultRecord = {
        element: descriptor,
        classification: "safe",
        dispatched: !outcome.error,
        dispatchError: outcome.error,
        effectObserved: outcome.effectObserved,
        effectDescription: outcome.effectDescription,
        beforeScreenshot: beforeRelative,
        afterScreenshot: afterRelative,
        urlBefore,
        urlAfter: outcome.urlAfter,
        timestamp: new Date().toISOString(),
      };
      actionResults.push(record);
      options.onEvent?.("action-result", { ...record });
      actionsDispatched += 1;
    }

    return {
      navigation,
      consoleMessages,
      pageErrors,
      failedRequests,
      httpErrors,
      brokenImages,
      deadLinkChecks,
      discoveredElements,
      actionResults,
      screenshots,
      truncatedByLimit,
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}
