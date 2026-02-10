import OpenAI from "openai";
import type {
  AIResponse,
  CoinMarketData,
  TechnicalIndicators,
  SentimentData,
  PortfolioState,
  RoundAnalysis,
} from "@/types";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

// DeepSeek V3 as primary model (best crypto trading performance), with fallbacks
const FREE_MODELS = [
  "deepseek/deepseek-chat-v3.1",
  "qwen/qwen3-30b-a3b-04-28",
  "openrouter/free",
];

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  let lastError: Error | null = null;

  for (let i = 0; i < FREE_MODELS.length; i++) {
    const model = FREE_MODELS[i];
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (content) return content;
    } catch (e) {
      lastError = e as Error;
      const msg = (e as Error).message ?? "";
      console.warn(`Model ${model} failed: ${msg}`);

      // On 429 rate limit, wait before trying next model
      if (msg.includes("429")) {
        const delay = 5000 + i * 3000;
        console.warn(`Rate limited, waiting ${delay / 1000}s before next model...`);
        await new Promise((r) => setTimeout(r, delay));
      }
      continue;
    }
  }

  throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
}

export async function getTradeDecisions(
  marketData: CoinMarketData[],
  indicators: Record<string, TechnicalIndicators>,
  sentiment: SentimentData,
  portfolio: PortfolioState,
  lessons: string[],
  trendingCoinIds: string[] = [],
  roundCreatedAt: Date = new Date()
): Promise<AIResponse> {
  const roundAgeHours = (Date.now() - roundCreatedAt.getTime()) / (1000 * 60 * 60);
  const remainingHours = Math.max(0, 72 - roundAgeHours);

  const systemPrompt = `Du bist ein erfahrener Krypto-Trader. Du verwaltest ein Spieldepot (Simulation).
Regeln:
- Startkapital: €1.000 pro Runde
- Transaktionsgebühr: €1 pro Trade
- 27,5% KESt auf realisierte Gewinne
- Minimaler Trade: €50
- Ziel: Kapital innerhalb von 3 Tagen verdoppeln (€1.000 → €2.000)
- Neben den Standard-Coins sind auch aktuell trendende Coins handelbar (mit "🔥 TRENDING" markiert). Diese können kurzfristige Chancen bieten, aber auch volatiler sein.

${lessons.length > 0 ? `\nLessons aus vergangenen Analysen (gewichtet):
- [AKTUELL] = höchste Priorität, unbedingt befolgen
- [VORHERIG] = wichtig, aber [AKTUELL] überschreibt bei Widersprüchen
- [ÄLTER] = Hintergrundwissen, nur relevant wenn nicht widersprochen
${lessons.map((l, i) => `${i + 1}. ${l}`).join("\n")}` : ""}

Antworte AUSSCHLIESSLICH mit validem JSON in diesem Format:
{
  "decisions": [
    {"action": "buy"|"sell"|"hold", "coinId": "bitcoin", "coinName": "Bitcoin", "amount": 50, "reasoning": "..."}
  ],
  "marketAnalysis": "Kurze Markteinschätzung"
}

Bei "buy": amount = Betrag in EUR den du investieren willst
Bei "sell": amount = Anzahl der Coins die du verkaufen willst
Bei "hold": amount = 0

Du kannst mehrere Entscheidungen treffen oder nur "hold" zurückgeben.`;

  const userPrompt = `## Runde
Laufzeit: ${roundAgeHours.toFixed(1)}h von 72h (${remainingHours.toFixed(1)}h verbleibend)

## Portfolio
Cash: €${portfolio.cash.toFixed(2)}
Gesamtwert: €${portfolio.totalValue.toFixed(2)}
P&L: €${portfolio.pnl.toFixed(2)} (${portfolio.pnlPercent.toFixed(1)}%)

### Holdings
${portfolio.holdings.length === 0 ? "Keine Bestände" : portfolio.holdings.map((h) => `- ${h.coinName}: ${h.amount.toFixed(6)} @ Ø€${h.avgBuyPrice.toFixed(2)} (aktuell: €${h.currentPrice.toFixed(2)}, P&L: €${h.pnl.toFixed(2)})`).join("\n")}

## Marktdaten
${marketData.map((c) => `- ${trendingCoinIds.includes(c.id) ? "🔥 TRENDING " : ""}${c.name} (${c.symbol}): €${c.current_price.toFixed(2)} | 24h: ${c.price_change_percentage_24h?.toFixed(1)}% | Vol: €${(c.total_volume / 1e6).toFixed(1)}M`).join("\n")}

## Technische Indikatoren
${Object.entries(indicators).map(([coinId, ind]) => `### ${coinId}
RSI: ${ind.rsi?.toFixed(1) ?? "N/A"} | SMA20: ${ind.sma20?.toFixed(2) ?? "N/A"} | SMA50: ${ind.sma50?.toFixed(2) ?? "N/A"}
MACD: ${ind.macd ? `${ind.macd.macd.toFixed(2)} (Signal: ${ind.macd.signal.toFixed(2)}, Hist: ${ind.macd.histogram.toFixed(2)})` : "N/A"}
Bollinger: ${ind.bollingerBands ? `Upper: ${ind.bollingerBands.upper.toFixed(2)} | Mid: ${ind.bollingerBands.middle.toFixed(2)} | Lower: ${ind.bollingerBands.lower.toFixed(2)}` : "N/A"}`).join("\n")}

## Sentiment
Fear & Greed: ${sentiment.fearGreedIndex ? `${sentiment.fearGreedIndex.value} (${sentiment.fearGreedIndex.classification})` : "N/A"}
Trending: ${sentiment.trendingCoins.map((c) => c.name).join(", ") || "N/A"}
News: ${sentiment.newsHeadlines.slice(0, 5).join(" | ") || "N/A"}`;

  const raw = await callAI(systemPrompt, userPrompt);

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI response does not contain valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as AIResponse;

  // Filter out invalid or hold-only decisions
  parsed.decisions = parsed.decisions.filter(
    (d) => d.action && d.coinId && (d.action !== "hold" || parsed.decisions.length === 1)
  );

  return parsed;
}

export async function generateRoundAnalysis(
  roundData: {
    transactions: { type: string; coinName: string; total: number; profit: number | null; reasoning: string }[];
    snapshots: { totalValue: number; createdAt: Date }[];
    startBalance: number;
    finalValue: number;
    analysisType?: "periodic" | "bust" | "final";
  },
  lessons: string[]
): Promise<RoundAnalysis> {
  const isPeriodic = roundData.analysisType === "periodic";
  const periodLabel = isPeriodic ? "der letzten 24 Stunden" : "einer Krypto-Trading-Runde";
  const summaryHint = isPeriodic
    ? "Zusammenfassung der letzten 24h (2-3 Sätze, NICHT als Rundenende formulieren)"
    : "Zusammenfassung der Runde (2-3 Sätze)";

  const systemPrompt = `Du bist ein Trading-Analyst. Analysiere den Verlauf ${periodLabel} (Simulation).
${isPeriodic ? "WICHTIG: Die Runde läuft noch! Dies ist eine Zwischenanalyse, KEIN Rundenende. Formuliere zukunftsgerichtet.\n" : ""}Erstelle eine umfassende Analyse.

Antworte AUSSCHLIESSLICH mit validem JSON:
{
  "summary": "${summaryHint}",
  "lessons": ["Lektion 1", "Lektion 2", ...],
  "mistakes": ["Fehler 1", "Fehler 2", ...],
  "strategies": ["Strategie 1", "Strategie 2", ...]
}`;

  const totalTrades = roundData.transactions.length;
  const buys = roundData.transactions.filter((t) => t.type === "buy").length;
  const sells = roundData.transactions.filter((t) => t.type === "sell").length;
  const profitableSells = roundData.transactions.filter(
    (t) => t.type === "sell" && (t.profit ?? 0) > 0
  ).length;
  const pnl = roundData.finalValue - roundData.startBalance;

  const headerLabel = isPeriodic ? "24h-Statistik" : "Rundenstatistik";
  const startLabel = isPeriodic ? "Portfoliowert vor 24h" : "Startkapital";

  const userPrompt = `## ${headerLabel}
${startLabel}: €${roundData.startBalance.toFixed(2)}
Aktueller Wert: €${roundData.finalValue.toFixed(2)}
P&L (${isPeriodic ? "24h" : "gesamt"}): €${pnl.toFixed(2)} (${((pnl / roundData.startBalance) * 100).toFixed(1)}%)
Trades: ${totalTrades} (${buys} Käufe, ${sells} Verkäufe)
Win-Rate: ${sells > 0 ? ((profitableSells / sells) * 100).toFixed(0) : 0}%

## Transaktionen${isPeriodic ? " (letzte 24h)" : ""}
${roundData.transactions.map((t) => `- ${t.type.toUpperCase()} ${t.coinName}: €${t.total.toFixed(2)}${t.profit !== null ? ` (P&L: €${t.profit.toFixed(2)})` : ""} — ${t.reasoning}`).join("\n")}

${lessons.length > 0 ? `## Bisherige Lessons\n${lessons.join("\n")}` : ""}`;

  const raw = await callAI(systemPrompt, userPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Analysis response does not contain valid JSON");

  return JSON.parse(jsonMatch[0]) as RoundAnalysis;
}
