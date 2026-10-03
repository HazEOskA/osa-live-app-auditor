import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const html = fs.readFileSync(path.join(__dirname, "fixtures", "pl-service.html"), "utf8");

test("operator flow on a phone: manual paste → ScoutBot → audit → copy → history", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Client Website Audit Desk" })).toBeVisible();

  // no horizontal scroll on mobile
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByLabel("Nazwa firmy").fill("Remonty Kowalski");
  await page.getByRole("button", { name: /Nie działa pobieranie/ }).click();
  await page.getByLabel(/Wklejony HTML/).fill(html);
  await page.getByRole("button", { name: "Uruchom ScoutBota" }).click();

  await expect(page.getByRole("heading", { name: "Scout Context" })).toBeVisible();
  await expect(page.getByText("firma remontowo-budowlana")).toBeVisible();

  await page.getByRole("button", { name: "Generuj audyt" }).click();
  await expect(page.getByTestId("score")).toBeVisible();
  const score = Number((await page.getByTestId("score").innerText()).split("/")[0]);
  expect(score).toBeGreaterThan(50);
  await expect(page.getByRole("heading", { name: "Raport audytu" })).toBeVisible();
  await expect(page.getByText(/szablon \(bez AI\)/)).toBeVisible();

  const msg = page.locator("#client-message");
  await expect(msg).toContainText("Remonty Kowalski");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.getByRole("button", { name: "Kopiuj wiadomość" }).click();
  await expect(page.getByRole("button", { name: /Skopiowano/ })).toBeVisible();

  // print/PDF route returns a standalone document
  const pdf = await page.request.post("/api/pdf", { data: await page.evaluate(() => JSON.parse(localStorage.getItem("cwad.history.v1")!)[0]) });
  expect(pdf.status()).toBe(200);
  expect(await pdf.text()).toContain(`${score}/100`);

  await page.getByRole("link", { name: "Historia" }).click();
  await expect(page.getByTestId("history-table")).toContainText("Remonty Kowalski");
  await page.getByRole("button", { name: "Otwórz" }).click();
  await expect(page.getByTestId("score")).toHaveText(new RegExp(`^${score}`));
});

test("a private URL is refused and the manual fallback is offered", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Adres strony klienta").fill("http://169.254.169.254/latest/meta-data/");
  await page.getByRole("button", { name: "Uruchom ScoutBota" }).click();
  await expect(page.getByTestId("error")).toContainText(/Private or reserved|nie udało/i);
  await expect(page.getByLabel(/Wklejony HTML/)).toBeVisible();
});

test("API rejects bad input and unknown shapes", async ({ request }) => {
  const bad = await request.post("/api/scout", { data: { language: "pl" } });
  expect(bad.status()).toBe(400);
  const blocked = await request.post("/api/scout", { data: { url: "http://localhost:3000", language: "en" } });
  expect(blocked.status()).toBe(400);
  expect((await blocked.json()).error).toBe("blocked");
  const audit = await request.post("/api/audit", { data: { scout: {} } });
  expect(audit.status()).toBe(400);
});
