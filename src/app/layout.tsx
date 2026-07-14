import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Osa Live App Auditor",
  description: "Autonomous, evidence-driven QA auditor for live web applications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
