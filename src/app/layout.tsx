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
        <header className="border-b border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-10 w-10 sm:h-14 sm:w-14">
              <rect width="512" height="512" rx="96" fill="#0a0a0a"/>
              <rect x="156" y="120" width="200" height="160" rx="32" fill="#3b82f6"/>
              <rect x="176" y="148" width="56" height="56" rx="12" fill="#0a0a0a"/>
              <rect x="280" y="148" width="56" height="56" rx="12" fill="#0a0a0a"/>
              <rect x="192" y="160" width="28" height="28" rx="6" fill="#22c55e"/>
              <rect x="296" y="160" width="28" height="28" rx="6" fill="#22c55e"/>
              <line x1="256" y1="120" x2="256" y2="80" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round"/>
              <circle cx="256" cy="72" r="12" fill="#22c55e"/>
              <rect x="200" y="228" width="112" height="24" rx="8" fill="#0a0a0a"/>
              <rect x="208" y="234" width="16" height="12" rx="2" fill="#22c55e"/>
              <rect x="232" y="234" width="16" height="12" rx="2" fill="#22c55e"/>
              <rect x="256" y="234" width="16" height="12" rx="2" fill="#22c55e"/>
              <rect x="280" y="234" width="16" height="12" rx="2" fill="#22c55e"/>
              <polyline points="80,400 160,380 240,340 300,370 360,300 432,320" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="300,370 360,300 432,320" fill="none" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-xl font-bold">AI Crypto Trader</h1>
          </div>
        </header>
        <main className="mx-auto max-w-7xl overflow-hidden p-3 sm:p-6">{children}</main>
      </body>
    </html>
  );
}
