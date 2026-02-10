import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveRound } from "@/lib/portfolio";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get("roundId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(10000, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)));

    let targetRoundId: number;

    if (roundId) {
      targetRoundId = parseInt(roundId, 10);
    } else {
      const round = await getActiveRound();
      if (!round) {
        return NextResponse.json({ error: "Keine aktive Runde" }, { status: 404 });
      }
      targetRoundId = round.id;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { roundId: targetRoundId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({
        where: { roundId: targetRoundId },
      }),
    ]);

    return NextResponse.json({
      transactions,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
