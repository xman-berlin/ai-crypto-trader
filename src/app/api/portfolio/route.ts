import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMarketData } from "@/lib/coingecko";
import { getPortfolioState, getActiveRound } from "@/lib/portfolio";

export async function GET() {
  try {
    const round = await getActiveRound();
    if (!round) {
      return NextResponse.json({ error: "Keine aktive Runde" }, { status: 404 });
    }

    const configEntry = await prisma.config.findUnique({
      where: { key: "watchedCoins" },
    });
    const watchedCoins: string[] = configEntry
      ? JSON.parse(configEntry.value)
      : ["bitcoin", "ethereum", "solana"];

    const marketData = await getMarketData(watchedCoins);
    const portfolio = await getPortfolioState(round.id, marketData);

    const snapshots = await prisma.snapshot.findMany({
      where: { roundId: round.id },
      orderBy: { createdAt: "asc" },
      select: { totalValue: true, cash: true, createdAt: true },
    });

    return NextResponse.json({ ...portfolio, snapshots });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
