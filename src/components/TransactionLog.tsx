"use client";

interface Transaction {
  id: number;
  type: string;
  coinName: string;
  amount: number;
  price: number;
  total: number;
  fee: number;
  tax: number;
  profit: number | null;
  reasoning: string;
  createdAt: string;
}

interface TransactionLogProps {
  transactions: Transaction[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function TransactionLog({
  transactions,
  page,
  totalPages,
  total,
  onPageChange,
}: TransactionLogProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transaktionen</h2>
        {total > 0 && (
          <span className="text-sm text-[var(--muted)]">{total} gesamt</span>
        )}
      </div>
      {transactions.length === 0 ? (
        <p className="text-[var(--muted)]">Noch keine Transaktionen</p>
      ) : (
        <>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="overflow-hidden rounded-md border border-[var(--card-border)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
                        tx.type === "buy"
                          ? "bg-[var(--green)]/20 text-[var(--green)]"
                          : "bg-[var(--red)]/20 text-[var(--red)]"
                      }`}
                    >
                      {tx.type.toUpperCase()}
                    </span>
                    <span className="truncate font-medium">{tx.coinName}</span>
                    <span className="hidden shrink-0 text-xs text-[var(--muted)] sm:inline">
                      {tx.amount.toFixed(6)} @ €{tx.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {tx.profit !== null && (
                      <span className={`text-sm font-medium ${tx.profit >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {tx.profit >= 0 ? "+" : ""}€{tx.profit.toFixed(2)}
                      </span>
                    )}
                    <div className="text-right">
                      <p className="font-medium">€{tx.total.toFixed(2)}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(tx.createdAt).toLocaleString("de-DE")}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-1 break-words text-xs text-[var(--muted)]">{tx.reasoning}</p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm disabled:opacity-30"
              >
                Zurück
              </button>
              <span className="text-sm text-[var(--muted)]">
                Seite {page} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm disabled:opacity-30"
              >
                Weiter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
