"use client";

import { useState } from "react";
import type { RoundWithAnalysis } from "@/types";
import Link from "next/link";

const PAGE_SIZE = 5;

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
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(rounds.length / PAGE_SIZE);
  const visible = rounds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (rounds.length === 0) {
    return <p className="text-[var(--muted)]">Keine Runden vorhanden</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {visible.map((r) => {
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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm disabled:opacity-30"
          >
            Zurück
          </button>
          <span className="text-sm text-[var(--muted)]">
            Seite {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm disabled:opacity-30"
          >
            Weiter
          </button>
        </div>
      )}
    </>
  );
}
