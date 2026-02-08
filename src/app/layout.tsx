import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Crypto Trader",
  description: "KI-gesteuerter Krypto-Trading-Simulator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen antialiased">
        <header className="border-b border-[var(--card-border)] px-6 py-4">
          <h1 className="text-xl font-bold">AI Crypto Trader</h1>
        </header>
        <main className="mx-auto max-w-7xl p-6">{children}</main>
      </body>
    </html>
  );
}
