import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMarketData, getTrendingCoins } from "@/lib/coingecko";

export async function GET() {
  try {
    const configEntry = await prisma.config.findUnique({
      where: { key: "watchedCoins" },
    });
    const watchedCoins: string[] = configEntry
      ? JSON.parse(configEntry.value)
      : ["bitcoin", "ethereum", "solana"];

    let trendingIds: string[] = [];
    try {
      const trending = await getTrendingCoins();
      trendingIds = trending.map((c) => c.id);
    } catch {
      // Trending coins are optional
    }

    const allCoins = [...new Set([...watchedCoins, ...trendingIds])];
    const marketData = await getMarketData(allCoins);
    return NextResponse.json(marketData);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
