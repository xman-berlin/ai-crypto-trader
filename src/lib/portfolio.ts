import { prisma } from "./db";
import type { PortfolioState, HoldingWithValue, CoinMarketData } from "@/types";

export async function getPortfolioState(
  roundId: number,
  marketData: CoinMarketData[]
): Promise<PortfolioState> {
  const round = await prisma.round.findUniqueOrThrow({
    where: { id: roundId },
    include: { holdings: true, transactions: true },
  });

  // Cash = startBalance + sells - buys - fees - taxes
  const cash = round.transactions.reduce((bal, tx) => {
    if (tx.type === "buy") {
      return bal - tx.total - tx.fee;
    } else {
      return bal + tx.total - tx.fee - tx.tax;
    }
  }, round.startBalance);

  const priceMap = new Map(marketData.map((c) => [c.id, c.current_price]));

  const holdings: HoldingWithValue[] = round.holdings
    .filter((h) => h.amount > 0)
    .map((h) => {
      const currentPrice = priceMap.get(h.coinId) ?? h.avgBuyPrice;
      const value = h.amount * currentPrice;
      const costBasis = h.amount * h.avgBuyPrice;
      const pnl = value - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      return {
        coinId: h.coinId,
        coinName: h.coinName,
        amount: h.amount,
        avgBuyPrice: h.avgBuyPrice,
        currentPrice,
        value,
        pnl,
        pnlPercent,
      };
    });

  const holdingsValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalValue = cash + holdingsValue;
  const pnl = totalValue - round.startBalance;
  const pnlPercent = (pnl / round.startBalance) * 100;

  return {
    roundId,
    cash,
    holdings,
    totalValue,
    pnl,
    pnlPercent,
  };
}

export async function getActiveRound() {
  return prisma.round.findFirst({
    where: { status: "active" },
    orderBy: { id: "desc" },
  });
}
