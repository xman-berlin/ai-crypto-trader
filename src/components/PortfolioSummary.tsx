"use client";

import type { PortfolioState } from "@/types";

export default function PortfolioSummary({
  portfolio,
}: {
  portfolio: PortfolioState;
}) {
  const pnlColor = portfolio.pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]";

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
      <h2 className="mb-4 text-lg font-semibold">Portfolio (Runde #{portfolio.roundId})</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-sm text-[var(--muted)]">Gesamtwert</p>
          <p className="text-2xl font-bold">€{portfolio.totalValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Cash</p>
          <p className="text-2xl font-bold">€{portfolio.cash.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">P&L</p>
          <p className={`text-2xl font-bold ${pnlColor}`}>
            €{portfolio.pnl.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">P&L %</p>
          <p className={`text-2xl font-bold ${pnlColor}`}>
            {portfolio.pnlPercent.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
