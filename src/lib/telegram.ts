const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function isConfigured(): boolean {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return false;
  }
  return true;
}

async function sendMessage(text: string): Promise<void> {
  if (!isConfigured()) return;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
}

interface PortfolioSummary {
  cash: number;
  totalValue: number;
  holdings: { coinName: string; coinId: string; amount: number }[];
}

export async function sendTradeNotification(params: {
  type: "buy" | "sell";
  coinName: string;
  coinAmount: number;
  price: number;
  totalEur: number;
  reasoning: string;
  portfolio: PortfolioSummary;
  pnl?: number;
  tax?: number;
}): Promise<void> {
  if (!isConfigured()) return;

  const { type, coinName, coinAmount, price, totalEur, reasoning, portfolio, pnl, tax } = params;

  const emoji = type === "buy" ? "🟢 BUY" : "🔴 SELL";
  const priceStr = formatEur(price);
  const totalStr = formatEur(totalEur);

  let msg = `${emoji} ${coinName}\n`;
  msg += `${coinAmount.toFixed(6)} @ €${priceStr} = €${totalStr}\n`;

  if (type === "sell" && pnl !== undefined) {
    const pnlSign = pnl >= 0 ? "+" : "";
    msg += `${pnlSign}€${formatEur(pnl)} P&L`;
    if (tax !== undefined && tax > 0) {
      msg += ` · €${formatEur(tax)} KESt`;
    }
    msg += "\n";
  }

  msg += `${reasoning}\n`;
  msg += "\n";
  msg += `💼 Cash: €${formatEur(portfolio.cash)} | Gesamt: €${formatEur(portfolio.totalValue)}\n`;

  if (portfolio.holdings.length > 0) {
    const holdingsStr = portfolio.holdings
      .map((h) => `${h.coinId.toUpperCase().slice(0, 4)} ${h.amount.toFixed(4)}`)
      .join(" · ");
    msg += holdingsStr;
  }

  await sendMessage(msg);
}

function formatEur(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
