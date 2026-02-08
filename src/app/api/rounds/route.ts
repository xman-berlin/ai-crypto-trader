import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const rounds = await prisma.round.findMany({
      orderBy: { id: "desc" },
      include: {
        analysis: true,
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
      analysis: r.analysis
        ? {
            summary: r.analysis.summary,
            lessons: JSON.parse(r.analysis.lessons),
            mistakes: JSON.parse(r.analysis.mistakes),
            strategies: JSON.parse(r.analysis.strategies),
          }
        : null,
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
