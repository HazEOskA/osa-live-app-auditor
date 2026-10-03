"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { clearHistory, deleteAudit, getBrowserStore, parseHistory, readHistoryRaw, subscribeHistory } from "@/lib/storage";
import { AuditReport } from "./AuditReport";
import { ClientMessageBox } from "./ClientMessageBox";
import { ScoreCard } from "./ScoreCard";
import type { AuditReport as Report } from "@/lib/schemas";

export function HistoryTable() {
  const raw = useSyncExternalStore(subscribeHistory, readHistoryRaw, () => null);
  const items: Report[] | null = useMemo(() => (raw === null ? null : parseHistory(raw)), [raw]);
  const [open, setOpen] = useState<string | null>(null);

  if (items === null) return <p className="muted">Ładowanie…</p>;
  if (items.length === 0) return <p className="card muted" data-testid="history-empty">Brak zapisanych audytów w tej przeglądarce.</p>;

  const selected = items.find((i) => i.id === open);

  return (
    <>
      <div className="card tablewrap">
        <table data-testid="history-table">
          <thead><tr><th>Data</th><th>Firma / URL</th><th>Wynik</th><th></th></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt.slice(0, 10)}</td>
                <td>{r.companyName || r.url}</td>
                <td>{r.score}</td>
                <td className="actions">
                  <button type="button" className="link" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Ukryj" : "Otwórz"}</button>
                  <button type="button" className="link danger" onClick={() => { deleteAudit(getBrowserStore(), r.id); }}>Usuń</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="link danger" onClick={() => { clearHistory(getBrowserStore()); }}>Wyczyść całą historię</button>
      </div>
      {selected && (
        <>
          <ScoreCard report={selected} />
          <AuditReport report={selected} />
          <ClientMessageBox message={selected.clientMessage} />
        </>
      )}
    </>
  );
}
