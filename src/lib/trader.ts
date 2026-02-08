import { prisma } from "./db";
import { getMarketData, getOHLC, getTrendingCoins } from "./coingecko";
import { calculateIndicators } from "./indicators";
import { getSentimentData } from "./sentiment";
import { getPortfolioState, getActiveRound } from "./portfolio";
import { getTradeDecisions } from "./ai";
import { calculateKESt, getTransactionFee } from "./tax";
import { getLessonsFromPreviousRounds, createRoundAnalysis } from "./learning";
import { sendTradeNotification } from "./telegram";
import type { TechnicalIndicators } from "@/types";

const MIN_TRADE_EUR = 5;
const BUST_THRESHOLD = 2; // €2

function log(step: string, detail?: string) {
  const ts = new Date().toLocaleTimeString("de-DE");
  console.log(`[${ts}] [TRADER] ${step}${detail ? ` — ${detail}` : ""}`);
}

export async function executeTick(): Promise<{
  success: boolean;
  message: string;
  actions: string[];
}> {
  const actions: string[] = [];
  const tickStart = Date.now();

  try {
    // 1. Get active round
    log("Step 1/10", "Aktive Runde laden...");
    const round = await getActiveRound();
    if (!round) {
      log("Step 1/10", "Keine aktive Runde, erstelle neue...");
      const newRound = await prisma.round.create({
        data: { startBalance: 1000 },
      });
      log("Done", `Neue Runde #${newRound.id} gestartet`);
      return {
        success: true,
        message: `Neue Runde #${newRound.id} gestartet`,
        actions: ["new_round"],
      };
    }
    log("Step 1/10", `Runde #${round.id} (Status: ${round.status})`);

    // 2. Get watched coins
    log("Step 2/10", "Config laden...");
    const configEntry = await prisma.config.findUnique({
      where: { key: "watchedCoins" },
    });
    const watchedCoins: string[] = configEntry
      ? JSON.parse(configEntry.value)
      : ["bitcoin", "ethereum", "solana"];
    log("Step 2/10", `${watchedCoins.length} Coins beobachtet`);

    // 2b. Merge trending coins
    log("Step 2/10", "Trending Coins laden...");
    let trendingCoinIds: string[] = [];
    try {
      const trending = await getTrendingCoins();
      trendingCoinIds = trending.map((c) => c.id);
      log("Step 2/10", `${trending.length} Trending Coins: ${trending.map((c) => c.name).join(", ")}`);
    } catch (e) {
      log("Step 2/10", `Trending Coins Fehler: ${(e as Error).message}`);
    }
    const allCoins = [...new Set([...watchedCoins, ...trendingCoinIds])];
    log("Step 2/10", `${allCoins.length} Coins gesamt (${watchedCoins.length} watched + ${trendingCoinIds.length} trending, dedupliziert)`);

    // 3. Fetch market data
    log("Step 3/10", "Marktdaten von CoinGecko laden...");
    const marketData = await getMarketData(allCoins);
    if (marketData.length === 0) {
      log("FEHLER", "Keine Marktdaten erhalten!");
      return { success: false, message: "Keine Marktdaten verfügbar", actions: [] };
    }
    log("Step 3/10", `${marketData.length} Coins geladen (BTC: €${marketData.find(c => c.id === "bitcoin")?.current_price?.toLocaleString("de-DE") ?? "?"})`);

    // 4. Fetch OHLC and calculate indicators
    const indicators: Record<string, TechnicalIndicators> = {};
    const holdings = await prisma.holding.findMany({
      where: { roundId: round.id, amount: { gt: 0 } },
    });
    // Limit OHLC fetches to held coins + top 3 to stay within CoinGecko rate limits
    const relevantCoins = [
      ...new Set([
        ...holdings.map((h) => h.coinId),
        ...watchedCoins.slice(0, 3),
      ]),
    ].slice(0, 3);

    log("Step 4/10", `OHLC laden für ${relevantCoins.length} Coins: ${relevantCoins.join(", ")}...`);
    for (const coinId of relevantCoins) {
      try {
        const ohlc = await getOHLC(coinId);
        indicators[coinId] = calculateIndicators(ohlc);
        log("Step 4/10", `  ✓ ${coinId}: RSI=${indicators[coinId].rsi?.toFixed(1) ?? "N/A"}`);
      } catch (e) {
        log("Step 4/10", `  ✗ ${coinId}: ${(e as Error).message}`);
      }
    }

    // 5. Get sentiment
    log("Step 5/10", "Sentiment-Daten laden...");
    const sentiment = await getSentimentData();
    log("Step 5/10", `Fear&Greed: ${sentiment.fearGreedIndex?.value ?? "N/A"} (${sentiment.fearGreedIndex?.classification ?? "?"}), ${sentiment.trendingCoins.length} trending, ${sentiment.newsHeadlines.length} News`);

    // 6. Get portfolio state
    log("Step 6/10", "Portfolio-Status berechnen...");
    const portfolio = await getPortfolioState(round.id, marketData);
    log("Step 6/10", `Cash: €${portfolio.cash.toFixed(2)}, Holdings: ${portfolio.holdings.length}, Gesamtwert: €${portfolio.totalValue.toFixed(2)}, P&L: €${portfolio.pnl.toFixed(2)}`);

    // 7. Get lessons
    log("Step 7/10", "Lessons aus früheren Runden laden...");
    const lessons = await getLessonsFromPreviousRounds();
    log("Step 7/10", `${lessons.length} Lessons geladen`);

    // 8. AI decision
    log("Step 8/10", "KI-Entscheidung anfordern (OpenRouter)...");
    const aiStart = Date.now();
    const aiResponse = await getTradeDecisions(
      marketData,
      indicators,
      sentiment,
      portfolio,
      lessons,
      trendingCoinIds
    );
    log("Step 8/10", `KI antwortete in ${((Date.now() - aiStart) / 1000).toFixed(1)}s — ${aiResponse.decisions.length} Entscheidung(en)`);
    log("Step 8/10", `Analyse: ${aiResponse.marketAnalysis}`);
    for (const d of aiResponse.decisions) {
      if (!d.action) {
        log("Step 8/10", `  → UNGÜLTIG: Decision ohne action — ${JSON.stringify(d)}`);
        continue;
      }
      log("Step 8/10", `  → ${d.action.toUpperCase()} ${d.coinName}: ${d.action === "buy" ? `€${d.amount}` : `${d.amount} Coins`} — ${d.reasoning}`);
    }

    actions.push(`analysis: ${aiResponse.marketAnalysis}`);

    // 9. Execute decisions
    log("Step 9/10", "Trades ausführen...");
    for (const decision of aiResponse.decisions) {
      if (!decision.action || !decision.coinId) {
        log("Step 9/10", `  SKIP ungültige Decision: ${JSON.stringify(decision)}`);
        continue;
      }
      if (decision.action === "hold") {
        log("Step 9/10", `  HOLD — ${decision.reasoning}`);
        continue;
      }

      const coinPrice =
        marketData.find((c) => c.id === decision.coinId)?.current_price;
      if (!coinPrice) {
        log("Step 9/10", `  SKIP ${decision.coinId} — kein Preis gefunden`);
        actions.push(`skip: ${decision.coinId} - kein Preis gefunden`);
        continue;
      }

      if (decision.action === "buy") {
        const bought = await executeBuy(
          round.id,
          decision.coinId,
          decision.coinName,
          decision.amount,
          coinPrice,
          portfolio.cash,
          decision.reasoning,
          actions
        );
        if (bought) {
          const snap = await getPortfolioState(round.id, marketData);
          sendTradeNotification({
            type: "buy",
            coinName: decision.coinName,
            coinAmount: bought.coinAmount,
            price: coinPrice,
            totalEur: bought.totalEur,
            reasoning: decision.reasoning,
            portfolio: {
              cash: snap.cash,
              totalValue: snap.totalValue,
              holdings: snap.holdings.map((h) => ({ coinName: h.coinName, coinId: h.coinId, amount: h.amount })),
            },
          }).catch((e) => log("TELEGRAM", `Fehler: ${(e as Error).message}`));
        }
      } else if (decision.action === "sell") {
        const sold = await executeSell(
          round.id,
          decision.coinId,
          decision.coinName,
          decision.amount,
          coinPrice,
          decision.reasoning,
          actions
        );
        if (sold) {
          const snap = await getPortfolioState(round.id, marketData);
          sendTradeNotification({
            type: "sell",
            coinName: decision.coinName,
            coinAmount: sold.coinAmount,
            price: coinPrice,
            totalEur: sold.totalEur,
            reasoning: decision.reasoning,
            portfolio: {
              cash: snap.cash,
              totalValue: snap.totalValue,
              holdings: snap.holdings.map((h) => ({ coinName: h.coinName, coinId: h.coinId, amount: h.amount })),
            },
            pnl: sold.profit,
            tax: sold.tax,
          }).catch((e) => log("TELEGRAM", `Fehler: ${(e as Error).message}`));
        }
      }
    }

    // 10. Save snapshot
    log("Step 10/10", "Snapshot speichern...");
    const updatedPortfolio = await getPortfolioState(round.id, marketData);
    await prisma.snapshot.create({
      data: {
        roundId: round.id,
        totalValue: updatedPortfolio.totalValue,
        cash: updatedPortfolio.cash,
      },
    });
    log("Step 10/10", `Snapshot: €${updatedPortfolio.totalValue.toFixed(2)}`);

    // 11. Bust check
    if (updatedPortfolio.totalValue < BUST_THRESHOLD) {
      log("BUST", `Gesamtwert €${updatedPortfolio.totalValue.toFixed(2)} < €${BUST_THRESHOLD}!`);
      await prisma.round.update({
        where: { id: round.id },
        data: { status: "busted", endedAt: new Date() },
      });

      actions.push(`BUST! Gesamtwert: €${updatedPortfolio.totalValue.toFixed(2)}`);

      try {
        log("BUST", "Analyse generieren...");
        await createRoundAnalysis(round.id);
        actions.push("Analyse erstellt");
        log("BUST", "Analyse erstellt");
      } catch (e) {
        actions.push(`Analyse-Fehler: ${(e as Error).message}`);
        log("BUST", `Analyse-Fehler: ${(e as Error).message}`);
      }

      const newRound = await prisma.round.create({
        data: { startBalance: 1000 },
      });
      actions.push(`Neue Runde #${newRound.id} gestartet`);
      log("BUST", `Neue Runde #${newRound.id} gestartet`);
    }

    const elapsed = ((Date.now() - tickStart) / 1000).toFixed(1);
    log("DONE", `Tick abgeschlossen in ${elapsed}s — Portfolio: €${updatedPortfolio.totalValue.toFixed(2)}`);

    return {
      success: true,
      message: `Tick abgeschlossen. Portfolio: €${updatedPortfolio.totalValue.toFixed(2)}`,
      actions,
    };
  } catch (e) {
    const elapsed = ((Date.now() - tickStart) / 1000).toFixed(1);
    log("FEHLER", `Tick fehlgeschlagen nach ${elapsed}s: ${(e as Error).message}`);
    return {
      success: false,
      message: `Tick fehlgeschlagen: ${(e as Error).message}`,
      actions,
    };
  }
}

async function executeBuy(
  roundId: number,
  coinId: string,
  coinName: string,
  amountEur: number,
  price: number,
  availableCash: number,
  reasoning: string,
  actions: string[]
): Promise<{ coinAmount: number; totalEur: number } | null> {
  const fee = getTransactionFee();

  if (amountEur < MIN_TRADE_EUR) {
    log("BUY", `SKIP ${coinName}: €${amountEur} unter Minimum €${MIN_TRADE_EUR}`);
    actions.push(`skip buy ${coinName}: unter Minimum (€${amountEur})`);
    return null;
  }
  if (amountEur + fee > availableCash) {
    amountEur = availableCash - fee;
    if (amountEur < MIN_TRADE_EUR) {
      log("BUY", `SKIP ${coinName}: nicht genug Cash (€${availableCash})`);
      actions.push(`skip buy ${coinName}: nicht genug Cash`);
      return null;
    }
    log("BUY", `${coinName}: Betrag reduziert auf €${amountEur.toFixed(2)} (Cash: €${availableCash.toFixed(2)})`);
  }

  const coinAmount = amountEur / price;

  const existing = await prisma.holding.findUnique({
    where: { roundId_coinId: { roundId, coinId } },
  });

  if (existing) {
    const totalAmount = existing.amount + coinAmount;
    const totalCost =
      existing.amount * existing.avgBuyPrice + coinAmount * price;
    const newAvgPrice = totalCost / totalAmount;

    await prisma.holding.update({
      where: { id: existing.id },
      data: { amount: totalAmount, avgBuyPrice: newAvgPrice },
    });
  } else {
    await prisma.holding.create({
      data: {
        roundId,
        coinId,
        coinName,
        amount: coinAmount,
        avgBuyPrice: price,
      },
    });
  }

  await prisma.transaction.create({
    data: {
      roundId,
      type: "buy",
      coinId,
      coinName,
      amount: coinAmount,
      price,
      total: amountEur,
      fee,
      reasoning,
    },
  });

  log("BUY", `${coinName}: ${coinAmount.toFixed(6)} @ €${price.toFixed(2)} = €${amountEur.toFixed(2)} (Fee: €${fee})`);
  actions.push(
    `BUY ${coinName}: ${coinAmount.toFixed(6)} @ €${price.toFixed(2)} (€${amountEur.toFixed(2)})`
  );

  return { coinAmount, totalEur: amountEur };
}

async function executeSell(
  roundId: number,
  coinId: string,
  coinName: string,
  coinAmount: number,
  price: number,
  reasoning: string,
  actions: string[]
): Promise<{ coinAmount: number; totalEur: number; profit: number; tax: number } | null> {
  const fee = getTransactionFee();

  const holding = await prisma.holding.findUnique({
    where: { roundId_coinId: { roundId, coinId } },
  });

  if (!holding || holding.amount <= 0) {
    log("SELL", `SKIP ${coinName}: keine Bestände`);
    actions.push(`skip sell ${coinName}: keine Bestände`);
    return null;
  }

  const sellAmount = Math.min(coinAmount, holding.amount);
  const total = sellAmount * price;

  if (total < MIN_TRADE_EUR) {
    log("SELL", `SKIP ${coinName}: €${total.toFixed(2)} unter Minimum`);
    actions.push(`skip sell ${coinName}: unter Minimum`);
    return null;
  }

  const { profit, tax } = calculateKESt(price, holding.avgBuyPrice, sellAmount);

  const remainingAmount = holding.amount - sellAmount;
  if (remainingAmount < 0.000001) {
    await prisma.holding.delete({ where: { id: holding.id } });
  } else {
    await prisma.holding.update({
      where: { id: holding.id },
      data: { amount: remainingAmount },
    });
  }

  await prisma.transaction.create({
    data: {
      roundId,
      type: "sell",
      coinId,
      coinName,
      amount: sellAmount,
      price,
      total,
      fee,
      tax,
      profit,
      reasoning,
    },
  });

  log("SELL", `${coinName}: ${sellAmount.toFixed(6)} @ €${price.toFixed(2)} = €${total.toFixed(2)} (P&L: €${profit.toFixed(2)}, KESt: €${tax.toFixed(2)})`);
  actions.push(
    `SELL ${coinName}: ${sellAmount.toFixed(6)} @ €${price.toFixed(2)} (€${total.toFixed(2)}, P&L: €${profit.toFixed(2)}, KESt: €${tax.toFixed(2)})`
  );

  return { coinAmount: sellAmount, totalEur: total, profit, tax };
}
