import Link from "next/link";
import { HistoryTable } from "@/components/HistoryTable";

export const metadata = { title: "Historia audytów" };

export default function HistoryPage() {
  return (
    <main className="wrap">
      <header className="top">
        <h1>Historia audytów</h1>
        <Link href="/">← Nowy audyt</Link>
      </header>
      <p className="muted small">Historia jest zapisana tylko w tej przeglądarce (localStorage) — nie na serwerze.</p>
      <HistoryTable />
    </main>
  );
}
