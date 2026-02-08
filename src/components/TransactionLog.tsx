"use client";

import { useState } from "react";

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
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
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
                className="rounded-md border border-[var(--card-border)] p-3 cursor-pointer"
                onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        tx.type === "buy"
                          ? "bg-[var(--green)]/20 text-[var(--green)]"
                          : "bg-[var(--red)]/20 text-[var(--red)]"
                      }`}
                    >
                      {tx.type.toUpperCase()}
                    </span>
                    <span className="font-medium">{tx.coinName}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">€{tx.total.toFixed(2)}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(tx.createdAt).toLocaleString("de-DE")}
                    </p>
                  </div>
                </div>
                {expanded === tx.id && (
                  <div className="mt-3 border-t border-[var(--card-border)] pt-3 text-sm">
                    <p>Menge: {tx.amount.toFixed(6)} @ €{tx.price.toFixed(2)}</p>
                    <p>Gebühr: €{tx.fee.toFixed(2)}</p>
                    {tx.profit !== null && (
                      <p>
                        P&L: <span className={tx.profit >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}>€{tx.profit.toFixed(2)}</span>
                        {tx.tax > 0 && ` (KESt: €${tx.tax.toFixed(2)})`}
                      </p>
                    )}
                    <p className="mt-2 text-[var(--muted)]">{tx.reasoning}</p>
                  </div>
                )}
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
