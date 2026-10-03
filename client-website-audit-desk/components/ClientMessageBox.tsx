"use client";

import { useState } from "react";

export function ClientMessageBox({ message }: { message: string }) {
  const [text, setText] = useState(message);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.getElementById("client-message") as HTMLTextAreaElement | null;
      el?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="card" aria-label="Wiadomość do klienta">
      <h2>Wiadomość do klienta</h2>
      <p className="muted small">Nic nie jest wysyłane automatycznie. Przejrzyj i edytuj przed użyciem.</p>
      <textarea id="client-message" rows={10} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" className="primary" onClick={copy}>{copied ? "Skopiowano ✓" : "Kopiuj wiadomość"}</button>
    </section>
  );
}
