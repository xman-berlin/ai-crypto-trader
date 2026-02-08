"use client";

import type { RoundWithAnalysis } from "@/types";
import Link from "next/link";

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
          {rounds.map((r) => (
            <Link
              key={r.id}
              href={`/rounds/${r.id}`}
              className="block rounded-md border border-[var(--card-border)] p-4 transition-colors hover:bg-[var(--background)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">Runde #{r.id}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      r.status === "active"
                        ? "bg-[var(--green)]/20 text-[var(--green)]"
                        : "bg-[var(--red)]/20 text-[var(--red)]"
                    }`}
                  >
                    {r.status === "active" ? "Aktiv" : "Bust"}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <p>{r.transactionCount} Trades</p>
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
              {r.analysis && (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {r.analysis.summary}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
