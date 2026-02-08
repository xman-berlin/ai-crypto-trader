# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered crypto trading simulation (German: "KI-gesteuerter Krypto-Trading-Simulator"). An AI trader manages a play portfolio with €1,000 starting capital, fetches market data via CoinGecko, and makes buy/sell decisions autonomously. On total loss ("bust"), a full analysis is generated and lessons feed into the next round. All transactions include 27.5% KESt (Austrian capital gains tax) on profits and €1 transaction fees.

## Tech Stack

- **Framework**: Next.js 15 with TypeScript (App Router)
- **Styling**: Tailwind CSS (Dark Theme)
- **Database**: PostgreSQL via Prisma (Neon in production, Docker locally)
- **AI**: OpenRouter API (free model, e.g. Kimi K2.5)
- **Market Data**: CoinGecko Free API
- **Charts**: Recharts
- **Data Fetching**: SWR (client-side polling)

## Build & Development Commands

```bash
npm run dev              # Start dev server
docker compose up -d     # Start local PostgreSQL
npx prisma migrate dev   # Apply schema changes
npx prisma generate      # Regenerate Prisma client after schema changes
npx ts-node prisma/seed.ts  # Seed database
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
10. Bust check: if total value < €2 → end round → generate analysis → start new round

### Key Design Decisions
- **Cash balance is computed, not stored**: `startBalance + sells - buys - fees - taxes`
- **Lessons injection**: All past round analyses are injected into the AI system prompt each tick
- **Tax calculation**: Only on sell with profit: `(sellPrice - avgBuyPrice) * amount * 0.275`

### Core Library Modules (`src/lib/`)
- `trader.ts` — Tick orchestration, buy/sell execution, bust detection (central entry point)
- `ai.ts` — OpenRouter client for trading decisions and round analysis
- `coingecko.ts` — Market data with 60s cache and rate limiting
- `indicators.ts` — Technical indicators computed from OHLC data
- `sentiment.ts` — Fear & Greed Index, trending coins, news RSS
- `portfolio.ts` — Portfolio state calculations
- `tax.ts` — Austrian KESt (27.5%) calculation
- `learning.ts` — Round statistics, analysis generation, lessons formatting
- `scheduler.ts` — setInterval-based trade loop (local dev only)

### API Routes (`src/app/api/`)
- `portfolio/` — GET portfolio status
- `transactions/` — GET transaction history
- `market/` — GET market data (cached)
- `trader/run/` — POST trigger manual trade tick
- `trader/status/` — GET scheduler status
- `cron/trade/` — GET Vercel Cron trade tick (auth via CRON_SECRET)
- `rounds/` — GET all rounds + analyses

## Deployment
- **Hosting**: Vercel (auto-deploy from GitHub)
- **Database**: Neon PostgreSQL (free tier)
- **Scheduler**: Vercel Cron (every 5 min) replaces setInterval in production
- **Local Dev**: Docker PostgreSQL + setInterval scheduler

## Environment Variables

```
OPENROUTER_API_KEY=   # Required for AI trading decisions
DATABASE_URL=         # PostgreSQL connection string (Neon or local Docker)
CRON_SECRET=          # Vercel Cron auth secret (production only)
TELEGRAM_BOT_TOKEN=   # Optional: Telegram notifications
TELEGRAM_CHAT_ID=     # Optional: Telegram chat ID
```

## Plan Management
- The detailed project plan with progress tracking lives in `ai-crypto-trader.md`
- Plans are stored in `docs/plans/` — update existing plan files, don't create new ones
- Progress is tracked with `- [ ]` / `- [x]` checkboxes

## Git
- Commits and push only on explicit user command — never commit or push autonomously
