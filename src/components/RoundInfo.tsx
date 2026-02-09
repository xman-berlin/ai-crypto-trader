"use client";

import type { RoundWithAnalysis } from "@/types";
import Link from "next/link";

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return { label: "Aktiv", className: "bg-[var(--green)]/20 text-[var(--green)]" };
    case "completed":
      return { label: "Completed", className: "bg-[var(--green)]/20 text-[var(--green)]" };
    case "expired":
      return { label: "Expired", className: "bg-yellow-500/20 text-yellow-500" };
    default:
      return { label: "Bust", className: "bg-[var(--red)]/20 text-[var(--red)]" };
  }
}

export default function RoundInfo({
  rounds,
}: {
  rounds: RoundWithAnalysis[];
}) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
      <h2 className="mb-4 text-lg font-semibold">Runden</h2>
      {rounds.length === 0 ? (
        <p className="text-[var(--muted)]">Keine Runden vorhanden</p>
      ) : (
        <div className="space-y-3">
          {rounds.map((r) => {
            const badge = statusBadge(r.status);
            return (
              <Link
                key={r.id}
                href={`/rounds/${r.id}`}
                className="block rounded-md border border-[var(--card-border)] p-4 transition-colors hover:bg-[var(--background)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Runde #{r.id}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <p>
                      {r.transactionCount} Trades
                      {r.analyses.length > 0 && ` · ${r.analyses.length} Analysen`}
                    </p>
                    {r.finalValue !== null && (
                      <p
                        className={
                          r.finalValue >= r.startBalance
                            ? "text-[var(--green)]"
                            : "text-[var(--red)]"
                        }
                      >
                        €{r.finalValue.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                {r.analyses[0] && (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {r.analyses[0].summary}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
