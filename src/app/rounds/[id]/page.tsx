import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

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
      analysis: true,
      transactions: { orderBy: { createdAt: "asc" } },
      snapshots: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!round) notFound();

  const lastSnapshot = round.snapshots[round.snapshots.length - 1];
  const finalValue = lastSnapshot?.totalValue ?? round.startBalance;
  const pnl = finalValue - round.startBalance;

  const analysis = round.analysis
    ? {
        summary: round.analysis.summary,
        lessons: JSON.parse(round.analysis.lessons) as string[],
        mistakes: JSON.parse(round.analysis.mistakes) as string[],
        strategies: JSON.parse(round.analysis.strategies) as string[],
      }
    : null;

  return (
    <div className="grid gap-6">
      <Link
        href="/"
        className="text-sm text-[var(--accent)] hover:underline"
      >
        &larr; Zurück zum Dashboard
      </Link>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Runde #{round.id}</h1>
          <span
            className={`rounded px-3 py-1 text-sm font-bold ${
              round.status === "active"
                ? "bg-[var(--green)]/20 text-[var(--green)]"
                : "bg-[var(--red)]/20 text-[var(--red)]"
            }`}
          >
            {round.status === "active" ? "Aktiv" : "Bust"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Startkapital</p>
            <p className="text-lg font-bold">€{round.startBalance.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Endwert</p>
            <p className="text-lg font-bold">€{finalValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">P&L</p>
            <p
              className={`text-lg font-bold ${
                pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
              }`}
            >
              €{pnl.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Trades</p>
            <p className="text-lg font-bold">{round.transactions.length}</p>
          </div>
        </div>
      </div>

      {analysis && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
          <h2 className="mb-4 text-lg font-semibold">Analyse</h2>
          <p className="mb-4">{analysis.summary}</p>

          {analysis.lessons.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 font-medium text-[var(--green)]">Lessons</h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {analysis.lessons.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.mistakes.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 font-medium text-[var(--red)]">Fehler</h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {analysis.mistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.strategies.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium text-[var(--accent)]">Strategien</h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {analysis.strategies.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Transaktionen</h2>
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
