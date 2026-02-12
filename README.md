# AI Crypto Trader

AI-powered crypto trading simulator — an autonomous AI manages a play portfolio with €1,000 starting capital, making independent buy/sell decisions based on market data, technical indicators, and sentiment analysis.

**[Live Demo →](https://ai-crypto-trader.vercel.app)**

## Features

- **Autonomous AI Trader** — AI analyzes market data and makes independent trading decisions every 5 minutes
- **Technical Analysis** — RSI, MACD, Bollinger Bands, SMA/EMA calculated from OHLC data
- **Sentiment Analysis** — Fear & Greed Index, trending coins, news evaluation
- **Realistic Tax Model** — Austrian capital gains tax (KESt, 27.5%) on profits + €1 transaction fees
- **Learning System** — Post-round analysis feeds lessons into the next round
- **Round System** — Bust at < €2, doubling target at €2,000, max 72h per round
- **Responsive Dashboard** — Portfolio overview, PnL chart, transaction history, round archive

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 (Dark Theme) |
| Database | PostgreSQL via Prisma 6 (Neon) |
| AI | OpenRouter API (DeepSeek V3.1 / Qwen Fallback) |
| Market Data | CoinGecko Free API, CoinPaprika (Fallback) |
| Charts | Recharts |
| Data Fetching | SWR (Client-side Polling) |
| Hosting | Vercel |
| Scheduler | cron-job.org (every 5 min) |

## Architecture

```
Trading Loop (every 5 min)
│
├── Fetch market data (CoinGecko Top 10)
├── Load OHLC + price history
├── Calculate technical indicators
├── Load sentiment data
├── Load portfolio state
├── Load lessons from previous rounds
├── AI decision via OpenRouter
├── Validate & execute trades
├── Save portfolio snapshot
└── Checks: Bust / Doubling / Time limit / 24h analysis
```

### Core Modules (`src/lib/`)

| Module | Description |
|--------|------------|
| `trader.ts` | Tick orchestration, trade execution, round detection |
| `ai.ts` | OpenRouter client for trading decisions and analyses |
| `coingecko.ts` | Market data with caching and rate limiting |
| `coinpaprika.ts` | Fallback market data (20k calls/month, no API key) |
| `indicators.ts` | Technical indicators from OHLC data |
| `sentiment.ts` | Fear & Greed Index, trending coins, news |
| `portfolio.ts` | Portfolio calculations |
| `tax.ts` | Austrian KESt calculation (27.5%) |
| `learning.ts` | Round analysis, weighted lessons, 24h cycle |
| `scheduler.ts` | setInterval-based trade loop (dev) |

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL database (e.g. [Neon](https://neon.tech))
- [OpenRouter](https://openrouter.ai) API key

### Setup

```bash
# Clone repository
git clone https://github.com/xman-berlin/ai-crypto-trader.git
cd ai-crypto-trader

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your keys

# Run database migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|------------|:--------:|
| `DATABASE_URL` | PostgreSQL connection string (Neon) | Yes |
| `OPENROUTER_API_KEY` | API key for AI trading decisions | Yes |
| `CRON_SECRET` | External cron auth (cron-job.org) | No |
| `TELEGRAM_BOT_TOKEN` | Telegram notifications | No |
| `TELEGRAM_CHAT_ID` | Telegram chat ID | No |

## Deployment

The app is automatically deployed via Vercel. The trading loop is triggered every 5 minutes by an external cron service ([cron-job.org](https://cron-job.org)) calling `/api/cron/trade`.

## License

ISC
