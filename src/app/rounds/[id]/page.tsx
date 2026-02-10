import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

function analysisTypeBadge(type: string) {
  switch (type) {
    case "periodic":
      return { label: "24h-Analyse", className: "bg-[var(--accent)]/20 text-[var(--accent)]" };
    case "final":
      return { label: "Finale Analyse", className: "bg-[var(--green)]/20 text-[var(--green)]" };
    default:
      return { label: "Bust-Analyse", className: "bg-[var(--red)]/20 text-[var(--red)]" };
  }
}

function roundStatusBadge(status: string) {
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

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roundId = parseInt(id, 10);
  if (isNaN(roundId)) notFound();

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      analyses: { orderBy: { createdAt: "desc" } },
      transactions: { orderBy: { createdAt: "asc" } },
      snapshots: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!round) notFound();

  const lastSnapshot = round.snapshots[round.snapshots.length - 1];
  const finalValue = lastSnapshot?.totalValue ?? round.startBalance;
  const pnl = finalValue - round.startBalance;

  const analyses = round.analyses.map((a) => ({
    type: a.type,
    summary: a.summary,
    lessons: JSON.parse(a.lessons) as string[],
    mistakes: JSON.parse(a.mistakes) as string[],
    strategies: JSON.parse(a.strategies) as string[],
    createdAt: a.createdAt,
  }));

  const badge = roundStatusBadge(round.status);

  return (
    <div className="grid gap-4 sm:gap-6">
      <Link
        href="/"
        className="text-sm text-[var(--accent)] hover:underline"
      >
        &larr; Zurück zum Dashboard
      </Link>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Runde #{round.id}</h1>
          <span
            className={`rounded px-3 py-1 text-sm font-bold ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs sm:text-sm text-[var(--muted)]">Startkapital</p>
            <p className="text-base sm:text-lg font-bold">€{round.startBalance.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-[var(--muted)]">Endwert</p>
            <p className="text-base sm:text-lg font-bold">€{finalValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-[var(--muted)]">P&L</p>
            <p
              className={`text-base sm:text-lg font-bold ${
                pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
              }`}
            >
              €{pnl.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-[var(--muted)]">Trades</p>
            <p className="text-base sm:text-lg font-bold">{round.transactions.length}</p>
          </div>
        </div>
      </div>

      {analyses.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-base sm:text-lg font-semibold">Analysen ({analyses.length})</h2>
          {analyses.map((a, idx) => {
            const typeBadge = analysisTypeBadge(a.type);
            return (
              <div key={idx} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${typeBadge.className}`}>
                    {typeBadge.label}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {a.createdAt.toLocaleString("de-DE")}
                  </span>
                </div>
                <p className="mb-4">{a.summary}</p>

                {a.lessons.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 font-medium text-[var(--green)]">Lessons</h3>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {a.lessons.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {a.mistakes.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 font-medium text-[var(--red)]">Fehler</h3>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {a.mistakes.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {a.strategies.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-medium text-[var(--accent)]">Strategien</h3>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {a.strategies.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-6">
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold">Transaktionen</h2>
        {round.transactions.length === 0 ? (
          <p className="text-[var(--muted)]">Keine Transaktionen</p>
        ) : (
          <div className="space-y-2">
            {round.transactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-md border border-[var(--card-border)] p-3"
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
                      {tx.createdAt.toLocaleString("de-DE")}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">{tx.reasoning}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
