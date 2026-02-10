# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered crypto trading simulation (German: "KI-gesteuerter Krypto-Trading-Simulator"). An AI trader manages a play portfolio with €1,000 starting capital, fetches market data via CoinGecko, and makes buy/sell decisions autonomously. On total loss ("bust"), a full analysis is generated and lessons feed into the next round. All transactions include 27.5% KESt (Austrian capital gains tax) on profits and €1 transaction fees.

## Tech Stack

- **Framework**: Next.js 16 with TypeScript (App Router)
- **Styling**: Tailwind CSS v4 (Dark Theme)
- **Database**: PostgreSQL via Prisma 6 (Neon — both dev and prod, separate databases)
- **AI**: OpenRouter API (DeepSeek V3.1 primary, Qwen fallback)
- **Market Data**: CoinGecko Free API (primary), CoinPaprika Free API (fallback)
- **Charts**: Recharts
- **Data Fetching**: SWR (client-side polling)

## Build & Development Commands

```bash
npm run dev              # Start dev server (uses Neon dev DB)
npx prisma migrate dev   # Apply schema changes
npx prisma generate      # Regenerate Prisma client after schema changes
npx ts-node prisma/seed.ts  # Seed database
npm run build            # Production build
```

## Architecture

### Trading Loop (every 5 minutes via scheduler)
1. Fetch market data (CoinGecko top-10 coins)
2. Fetch OHLC + price history for watched coins
3. Calculate technical indicators (RSI, MACD, Bollinger Bands, SMA/EMA)
4. Load sentiment (Fear & Greed Index, trending coins, news)
5. Load portfolio state (cash + holdings)
6. Load lessons from previous rounds
7. Call AI via OpenRouter with all data → parse JSON response
8. Validate & execute trades → DB updates
9. Save portfolio snapshot (for charts)
10. Periodic 24h analysis check → generate if due
11. Bust check: if total value < €2 → end round → generate analysis → start new round
12. Doubling check: if total value >= 2x start → end round as "completed"
13. Time limit check: if round > 72h → end round as "expired"

### Key Design Decisions
- **Cash balance is computed, not stored**: `startBalance + sells - buys - fees - taxes`
- **Lessons injection**: Last 3 analyses injected with weight tags ([AKTUELL], [VORHERIG], [ÄLTER])
- **24h analysis cycle**: Periodic analyses created every 24h during active rounds
- **Round limits**: 72h max duration, doubling target (€1,000 → €2,000), min trade €50 (buy only; sells allowed below €50 if full position value < €50)
- **Tax calculation**: Only on sell with profit: `(sellPrice - avgBuyPrice) * amount * 0.275`
- **CoinID resolution**: AI may return symbols instead of CoinGecko IDs; trader matches by symbol and fetches on-demand if coin not in market data
- **24h analysis**: Uses portfolio value from 24h ago as baseline, separate prompt (interim, not round-end)

### Core Library Modules (`src/lib/`)
- `trader.ts` — Tick orchestration, buy/sell execution, bust/doubling/time-limit detection (central entry point)
- `ai.ts` — OpenRouter client for trading decisions and round analysis
- `coingecko.ts` — Market data with 2min cache and rate limiting, CoinPaprika fallback for missing coins
- `coinpaprika.ts` — Fallback market data source (20k calls/month, no API key), ID mapping CoinGecko→CoinPaprika
- `indicators.ts` — Technical indicators computed from OHLC data
- `sentiment.ts` — Fear & Greed Index, trending coins, news RSS
- `portfolio.ts` — Portfolio state calculations
- `tax.ts` — Austrian KESt (27.5%) calculation
- `learning.ts` — Round analysis generation (bust/periodic/final), weighted lessons, 24h cycle check
- `scheduler.ts` — setInterval-based trade loop (dev server only)

### API Routes (`src/app/api/`)
- `portfolio/` — GET portfolio status + snapshots (for PnL chart)
- `transactions/` — GET transaction history
- `market/` — GET market data (cached)
- `trader/run/` — POST trigger manual trade tick
- `trader/status/` — GET scheduler status (last tick from DB snapshots)
- `cron/trade/` — GET Vercel Cron trade tick (auth via CRON_SECRET)
- `rounds/` — GET all rounds + analyses

## Deployment

### Production
- **Hosting**: Vercel (auto-deploy from GitHub)
- **Database**: Neon PostgreSQL (prod database)
- **Scheduler**: Vercel Cron (every 5 min)

### Local Development
- **Database**: Neon PostgreSQL (dev database `cryptotrader_dev` — no Docker needed)
- **Scheduler**: setInterval via dev server

## Environment Variables

```
OPENROUTER_API_KEY=   # Required for AI trading decisions
DATABASE_URL=         # PostgreSQL connection string (Neon — dev and prod use separate databases)
CRON_SECRET=          # Vercel Cron auth secret (production only)
TELEGRAM_BOT_TOKEN=   # Optional: Telegram notifications
TELEGRAM_CHAT_ID=     # Optional: Telegram chat ID
```

## Plan Management
- The detailed project plans with progress tracking live in `docs/plans/`
- Plans are stored in `docs/plans/` — update existing plan files, don't create new ones
- Progress is tracked with `- [ ]` / `- [x]` checkboxes

## Documentation
- After significant changes (new features, architecture changes, tech stack updates), always update this CLAUDE.md to reflect the current state

## Git
- Commits and push only on explicit user command — never commit or push autonomously
