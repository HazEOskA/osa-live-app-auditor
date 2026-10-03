"use client";

import { useEffect, useRef, useState } from "react";
import { getPassword, setPassword } from "@/lib/client";
import type { ReportLanguage, ScoutRequest } from "@/lib/schemas";

interface Props {
  busy: boolean;
  manualOpen: boolean;
  onManualToggle: (open: boolean) => void;
  onSubmit: (req: ScoutRequest) => void;
}

export function AuditForm({ busy, manualOpen, onManualToggle, onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [language, setLanguage] = useState<ReportLanguage>("pl");
  const [notes, setNotes] = useState("");
  const [manual, setManual] = useState("");
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pwRef.current) pwRef.current.value = getPassword();
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setPassword(pwRef.current?.value ?? "");
    const base = {
      companyName: companyName.trim() || undefined,
      industry: industry.trim() || undefined,
      notes: notes.trim() || undefined,
      language,
    };
    if (manualOpen && manual.trim()) {
      const looksLikeHtml = /<[a-z][\s\S]*>/i.test(manual);
      onSubmit({ ...base, url: url.trim() || undefined, ...(looksLikeHtml ? { html: manual } : { text: manual }) });
    } else {
      onSubmit({ ...base, url: url.trim() });
    }
  }

  return (
    <form className="card form" onSubmit={submit} aria-label="Formularz audytu">
      <label>
        Adres strony klienta
        <input
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://firma-klienta.pl"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required={!manualOpen}
        />
      </label>

      <div className="row">
        <label>
          Nazwa firmy <span className="opt">(opcjonalnie)</span>
          <input name="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </label>
        <label>
          Branża <span className="opt">(opcjonalnie)</span>
          <input name="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </label>
      </div>

      <div className="row">
        <label>
          Język raportu
          <select name="language" value={language} onChange={(e) => setLanguage(e.target.value as ReportLanguage)}>
            <option value="pl">Polski</option>
            <option value="en">English</option>
            <option value="nl">Nederlands</option>
          </select>
        </label>
        <label>
          Hasło operatora
          <input name="password" type="password" autoComplete="current-password" ref={pwRef} />
        </label>
      </div>

      <label>
        Notatki operatora <span className="opt">(opcjonalnie)</span>
        <textarea name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <button type="button" className="link" onClick={() => onManualToggle(!manualOpen)} aria-expanded={manualOpen}>
        {manualOpen ? "Ukryj ręczne wklejanie" : "Nie działa pobieranie? Wklej treść / HTML ręcznie"}
      </button>
      {manualOpen && (
        <label>
          Wklejony HTML lub tekst strony głównej
          <textarea name="manual" rows={6} value={manual} onChange={(e) => setManual(e.target.value)} />
        </label>
      )}

      <button type="submit" className="primary" disabled={busy}>
        {busy ? "Zwiadowca pracuje…" : "Uruchom ScoutBota"}
      </button>
    </form>
  );
}
