import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const rounds = await prisma.round.findMany({
      orderBy: { id: "desc" },
      include: {
        analyses: { orderBy: { createdAt: "desc" } },
        _count: { select: { transactions: true } },
        snapshots: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const result = rounds.map((r) => ({
      id: r.id,
      startBalance: r.startBalance,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      endedAt: r.endedAt?.toISOString() ?? null,
      analyses: r.analyses.map((a) => ({
        type: a.type,
        summary: a.summary,
        lessons: JSON.parse(a.lessons),
        mistakes: JSON.parse(a.mistakes),
        strategies: JSON.parse(a.strategies),
        createdAt: a.createdAt.toISOString(),
      })),
      transactionCount: r._count.transactions,
      finalValue: r.snapshots[0]?.totalValue ?? null,
    }));

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
