import { cleanHtml, signalsFromManualInput } from "./cleanHtml";
import { createScoutContext } from "./createScoutContext";
import { fetchPublicWebsite, FetchError, type FetchOptions } from "./fetchPublicWebsite";
import { MESSAGES } from "./messages";
import type { ScoutContext, ScoutRequest } from "./schemas";

export class ScoutError extends Error {
  constructor(
    public code: string,
    message: string,
    public manualFallback = true,
  ) {
    super(message);
    this.name = "ScoutError";
  }
}

/**
 * ScoutBot: gathers a compact, factual context from ONE public page.
 * It never crawls, never writes the audit and never talks to the LLM.
 * When automatic fetch fails the caller is told to use the manual paste fallback.
 */
export async function runScoutBot(req: ScoutRequest, fetchOpts?: FetchOptions): Promise<ScoutContext> {
  const language = req.language ?? "pl";

  if (req.html || req.text) {
    const signals = signalsFromManualInput({ html: req.html, text: req.text });
    return createScoutContext({
      url: req.url?.trim() || "(manual input)",
      signals,
      language,
      industry: req.industry,
      fetchMode: "manual",
    });
  }

  if (!req.url) throw new ScoutError("missing_input", "Provide url, html or text", false);

  try {
    const page = await fetchPublicWebsite(req.url, fetchOpts);
    return createScoutContext({
      url: page.finalUrl,
      signals: cleanHtml(page.html),
      language,
      industry: req.industry,
      fetchMode: "fetched",
      truncated: page.truncated,
    });
  } catch (e) {
    if (e instanceof FetchError) {
      const m = MESSAGES[language].limitations.fetchFailed;
      throw new ScoutError(e.code, `${m} (${e.message})`, true);
    }
    throw e;
  }
}
