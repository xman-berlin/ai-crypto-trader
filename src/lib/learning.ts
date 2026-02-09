import { prisma } from "./db";
import { generateRoundAnalysis } from "./ai";

export async function getLessonsFromPreviousRounds(): Promise<string[]> {
  const analyses = await prisma.analysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const lessons: string[] = [];
  for (let i = 0; i < analyses.length; i++) {
    const prefix = i === 0 ? "[AKTUELL]" : i === 1 ? "[VORHERIG]" : "[ÄLTER]";
    const parsed: string[] = JSON.parse(analyses[i].lessons);
    lessons.push(...parsed.map((l) => `${prefix} ${l}`));
  }
  return lessons;
}

export async function shouldRunPeriodicAnalysis(roundId: number): Promise<boolean> {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) return false;

  const lastAnalysis = await prisma.analysis.findFirst({
    where: { roundId },
    orderBy: { createdAt: "desc" },
  });

  const referenceTime = lastAnalysis ? lastAnalysis.createdAt : round.createdAt;
  const hoursSince = (Date.now() - referenceTime.getTime()) / (1000 * 60 * 60);
  return hoursSince >= 24;
}

export async function createPeriodicAnalysis(roundId: number): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const round = await prisma.round.findUniqueOrThrow({
    where: { id: roundId },
    include: {
      transactions: {
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
      },
      snapshots: {
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const lastSnapshot = round.snapshots[round.snapshots.length - 1];
  const finalValue = lastSnapshot?.totalValue ?? round.startBalance;

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
      type: "periodic",
      summary: analysis.summary,
      lessons: JSON.stringify(analysis.lessons),
      mistakes: JSON.stringify(analysis.mistakes),
      strategies: JSON.stringify(analysis.strategies),
    },
  });
}

export async function createRoundAnalysis(roundId: number, type: string = "bust"): Promise<void> {
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
      type,
      summary: analysis.summary,
      lessons: JSON.stringify(analysis.lessons),
      mistakes: JSON.stringify(analysis.mistakes),
      strategies: JSON.stringify(analysis.strategies),
    },
  });
}
