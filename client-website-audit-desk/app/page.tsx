"use client";

import Link from "next/link";
import { useState } from "react";
import { AuditForm } from "@/components/AuditForm";
import { AuditReport } from "@/components/AuditReport";
import { ClientMessageBox } from "@/components/ClientMessageBox";
import { ScoreCard } from "@/components/ScoreCard";
import { ScoutContextCard } from "@/components/ScoutContextCard";
import { postJson, getPassword, type ApiError } from "@/lib/client";
import type { AuditReport as Report, OperatorInput, ScoutContext, ScoutRequest } from "@/lib/schemas";
import { getBrowserStore, saveAudit } from "@/lib/storage";

export default function Home() {
  const [busy, setBusy] = useState<"" | "scout" | "audit">("");
  const [error, setError] = useState<ApiError | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [scout, setScout] = useState<ScoutContext | null>(null);
  const [operator, setOperator] = useState<OperatorInput | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [saved, setSaved] = useState(true);

  async function runScout(req: ScoutRequest) {
    setBusy("scout");
    setError(null);
    setReport(null);
    setScout(null);
    const res = await postJson<{ scout: ScoutContext }>("/api/scout", req);
    setBusy("");
    if (!res.ok) {
      setError(res.error);
      if (res.error.manualFallback) setManualOpen(true);
      return;
    }
    setOperator({ companyName: req.companyName, industry: req.industry, language: req.language ?? "pl", notes: req.notes });
    setScout(res.data.scout);
  }

  async function runAudit() {
    if (!scout || !operator) return;
    setBusy("audit");
    setError(null);
    const res = await postJson<{ report: Report }>("/api/audit", { ...operator, scout });
    setBusy("");
    if (!res.ok) return setError(res.error);
    setReport(res.data.report);
    setSaved(saveAudit(getBrowserStore(), res.data.report));
  }

  async function openPdf() {
    if (!report) return;
    const w = window.open("", "_blank");
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-password": getPassword() },
      body: JSON.stringify(report),
    });
    if (!res.ok) {
      w?.close();
      return setError({ error: "pdf", message: "Nie udało się przygotować PDF. Użyj „Drukuj ten widok”." });
    }
    const url = URL.createObjectURL(new Blob([await res.text()], { type: "text/html" }));
    if (w) w.location.href = url;
    else window.location.href = url;
  }

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Client Website Audit Desk</h1>
          <p className="muted small">ScoutBot → Scout Context → audyt → PDF → wiadomość</p>
        </div>
        <Link href="/history">Historia</Link>
      </header>

      <div className="noprint">
        <AuditForm busy={busy === "scout"} manualOpen={manualOpen} onManualToggle={setManualOpen} onSubmit={runScout} />
      </div>

      {error && (
        <p className="card error noprint" role="alert" data-testid="error">
          {error.message}
          {error.manualFallback ? " Możesz wkleić treść strony ręcznie poniżej formularza." : ""}
        </p>
      )}

      {scout && <ScoutContextCard scout={scout} />}

      {scout && !report && (
        <button type="button" className="primary big noprint" onClick={runAudit} disabled={busy === "audit"}>
          {busy === "audit" ? "Generuję audyt…" : "Generuj audyt"}
        </button>
      )}

      {report && (
        <>
          <ScoreCard report={report} />
          <AuditReport report={report} />
          <ClientMessageBox message={report.clientMessage} />
          <div className="actions noprint">
            <button type="button" className="primary" onClick={() => window.print()}>Drukuj ten widok / zapisz PDF</button>
            <button type="button" onClick={openPdf}>Otwórz wersję do druku</button>
          </div>
          {!saved && <p className="notice noprint">Nie udało się zapisać w historii (pamięć przeglądarki niedostępna).</p>}
        </>
      )}
    </main>
  );
}
