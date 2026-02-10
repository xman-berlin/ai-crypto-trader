"use client";

import type { HoldingWithValue } from "@/types";

export default function HoldingsTable({
  holdings,
}: {
  holdings: HoldingWithValue[];
}) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-6">
        <h2 className="mb-4 text-base sm:text-lg font-semibold">Bestände</h2>
        <p className="text-[var(--muted)]">Keine Bestände vorhanden</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-6">
      <h2 className="mb-4 text-base sm:text-lg font-semibold">Bestände</h2>

      {/* Mobile: Cards */}
      <div className="space-y-3 sm:hidden">
        {holdings.map((h) => (
          <div key={h.coinId} className="rounded-md border border-[var(--card-border)] p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{h.coinName}</span>
              <span
                className={`text-sm font-medium ${
                  h.pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                }`}
              >
                {h.pnl >= 0 ? "+" : ""}€{h.pnl.toFixed(2)} ({h.pnlPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
              <span>Menge: {h.amount.toFixed(6)}</span>
              <span className="text-right">Wert: €{h.value.toFixed(2)}</span>
              <span>Ø Kauf: €{h.avgBuyPrice.toFixed(2)}</span>
              <span className="text-right">Aktuell: €{h.currentPrice.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-[var(--muted)]">
              <th className="pb-2">Coin</th>
              <th className="pb-2 text-right">Menge</th>
              <th className="pb-2 text-right">Ø Kaufpreis</th>
              <th className="pb-2 text-right">Aktuell</th>
              <th className="pb-2 text-right">Wert</th>
              <th className="pb-2 text-right">P&L</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.coinId} className="border-b border-[var(--card-border)]">
                <td className="py-2 font-medium">{h.coinName}</td>
                <td className="py-2 text-right">{h.amount.toFixed(6)}</td>
                <td className="py-2 text-right">€{h.avgBuyPrice.toFixed(2)}</td>
                <td className="py-2 text-right">€{h.currentPrice.toFixed(2)}</td>
                <td className="py-2 text-right">€{h.value.toFixed(2)}</td>
                <td
                  className={`py-2 text-right font-medium ${
                    h.pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                  }`}
                >
                  €{h.pnl.toFixed(2)} ({h.pnlPercent.toFixed(1)}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
