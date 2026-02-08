import { prisma } from "./db";
import { generateRoundAnalysis } from "./ai";

export async function getLessonsFromPreviousRounds(): Promise<string[]> {
  const analyses = await prisma.analysis.findMany({
    orderBy: { roundId: "desc" },
    take: 3,
  });

  const lessons: string[] = [];
  for (const a of analyses) {
    const parsed: string[] = JSON.parse(a.lessons);
    lessons.push(...parsed);
  }
  return lessons;
}

export async function createRoundAnalysis(roundId: number): Promise<void> {
  const round = await prisma.round.findUniqueOrThrow({
    where: { id: roundId },
    include: {
      transactions: { orderBy: { createdAt: "asc" } },
      snapshots: { orderBy: { createdAt: "asc" } },
    },
  });

  const lastSnapshot = round.snapshots[round.snapshots.length - 1];
  const finalValue = lastSnapshot?.totalValue ?? 0;

  const lessons = await getLessonsFromPreviousRounds();

  const analysis = await generateRoundAnalysis(
    {
      transactions: round.transactions.map((t) => ({
        type: t.type,
        coinName: t.coinName,
        total: t.total,
        profit: t.profit,
        reasoning: t.reasoning,
      })),
      snapshots: round.snapshots.map((s) => ({
        totalValue: s.totalValue,
        createdAt: s.createdAt,
      })),
      startBalance: round.startBalance,
      finalValue,
    },
    lessons
  );

  await prisma.analysis.create({
    data: {
      roundId,
      summary: analysis.summary,
      lessons: JSON.stringify(analysis.lessons),
      mistakes: JSON.stringify(analysis.mistakes),
      strategies: JSON.stringify(analysis.strategies),
    },
  });
}
