"use client";

interface Transaction {
  type: string;
  profit: number | null;
  tax: number;
  fee: number;
}

export default function TaxSummary({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const sells = transactions.filter((t) => t.type === "sell");
  const totalProfit = sells.reduce((sum, t) => sum + (t.profit ?? 0), 0);
  const totalTax = sells.reduce((sum, t) => sum + t.tax, 0);
  const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0);
  const realizedGains = sells.filter((t) => (t.profit ?? 0) > 0).reduce((sum, t) => sum + (t.profit ?? 0), 0);
  const realizedLosses = sells.filter((t) => (t.profit ?? 0) < 0).reduce((sum, t) => sum + (t.profit ?? 0), 0);

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
      <h2 className="mb-4 text-lg font-semibold">Steuern & Gebühren</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-[var(--muted)]">Realisierte Gewinne</p>
          <p className="text-lg font-bold text-[var(--green)]">
            €{realizedGains.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Realisierte Verluste</p>
          <p className="text-lg font-bold text-[var(--red)]">
            €{realizedLosses.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Netto P&L</p>
          <p
            className={`text-lg font-bold ${
              totalProfit >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
            }`}
          >
            €{totalProfit.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">KESt (27,5%)</p>
          <p className="text-lg font-bold">€{totalTax.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Gebühren</p>
          <p className="text-lg font-bold">€{totalFees.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
