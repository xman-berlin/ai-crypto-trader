# AI Crypto Trader Simulation

## Context
Aufbau einer KI-gesteuerten Krypto-Trading-Simulation als Webanwendung. Ein KI-Trader verwaltet ein Spieldepot mit €1.000 Startkapital, recherchiert eigenständig Marktdaten über CoinGecko und trifft Kauf-/Verkaufsentscheidungen. Bei Totalverlust wird eine umfassende Analyse erstellt, deren Erkenntnisse in die nächste Runde einfließen. Alle Transaktionen werden mit 27,5% KESt auf Gewinne und €1 Transaktionsgebühr berechnet.

## Tech-Stack
- **Frontend/Backend**: Next.js 15 + TypeScript (App Router)
- **Styling**: Tailwind CSS (Dark Theme)
- **Datenbank**: SQLite via Prisma
- **KI**: OpenRouter API (kostenloses Modell, z.B. Kimi K2.5 — fallback auf bestes verfügbares Free-Modell)
- **Marktdaten**: CoinGecko Free API (Live-Preise)
- **Charts**: Recharts
- **Data Fetching**: SWR (Polling)

## Projektstruktur

```
src/
├── app/
│   ├── layout.tsx              # Root Layout (Dark Theme)
│   ├── page.tsx                # Dashboard
│   ├── globals.css
│   ├── api/
│   │   ├── portfolio/route.ts  # GET Portfolio-Status
│   │   ├── transactions/route.ts # GET Transaktionshistorie
│   │   ├── market/route.ts     # GET Marktdaten (cached)
│   │   ├── trader/run/route.ts # POST manueller Trade-Tick
│   │   ├── trader/status/route.ts # GET Scheduler-Status
│   │   └── rounds/route.ts    # GET alle Runden + Analysen
│   └── rounds/[id]/page.tsx   # Runden-Detailseite
├── lib/
│   ├── db.ts                  # Prisma Client Singleton
│   ├── coingecko.ts           # CoinGecko API Client
│   ├── ai.ts                  # OpenRouter API (Entscheidungen + Analyse)
│   ├── trader.ts              # Kern-Trading-Logik (Tick-Orchestrierung)
│   ├── tax.ts                 # KESt-Berechnung (27,5%)
│   ├── portfolio.ts           # Portfolio-Berechnungen
│   ├── learning.ts            # Analyse & Lessons-Extraktion
│   ├── indicators.ts          # Technische Indikatoren (RSI, MACD, SMA, EMA, Bollinger)
│   ├── sentiment.ts           # Fear & Greed Index, Trending, News
│   └── scheduler.ts           # setInterval-basierter Trade-Loop
├── components/
│   ├── Dashboard.tsx          # Haupt-Container mit SWR-Hooks
│   ├── PortfolioSummary.tsx   # Cash, Holdings, Gesamtwert, P&L
│   ├── HoldingsTable.tsx      # Aktuelle Bestände
│   ├── TransactionLog.tsx     # Transaktionshistorie (erweiterbar)
│   ├── MarketTicker.tsx       # Live-Preise
│   ├── PnLChart.tsx           # Portfolio-Wert über Zeit
│   ├── RoundInfo.tsx          # Runden-Info + Lessons
│   ├── TraderStatus.tsx       # KI-Status + manueller Trigger
│   └── TaxSummary.tsx         # Realisierte Gewinne + KESt
├── types/index.ts
prisma/
├── schema.prisma
└── seed.ts
```

## Datenbank-Schema (Prisma/SQLite)

| Model | Zweck |
|-------|-------|
| **Round** | Eine Spielrunde (id, startBalance=1000, status: active/busted, Zeitstempel) |
| **Holding** | Aktueller Bestand pro Coin pro Runde (coinId, amount, avgBuyPrice) |
| **Transaction** | Jede Transaktion (buy/sell, Coin, Menge, Preis, Fee=€1, KESt, P&L, Reasoning) |
| **Snapshot** | Portfolio-Wert zu jedem Tick (für Chart) |
| **Analysis** | Rundenanalyse (Zusammenfassung, Lessons, Fehler, Strategien) - 1:1 mit Round |
| **Config** | Key-Value Konfiguration (Intervall, beobachtete Coins) |

Cash-Balance wird **berechnet** (nicht gespeichert) = startBalance + Verkäufe - Käufe - Gebühren - Steuern.

## Datenquellen für KI-Entscheidungen

| Quelle | Daten | API / Methode |
|--------|-------|---------------|
| **CoinGecko Markets** | Preis, 24h Change, Volume, Market Cap, ATH/ATL | `/coins/markets` |
| **CoinGecko OHLC** | Candlestick-Daten (30min-4h Auflösung) | `/coins/{id}/ohlc` |
| **CoinGecko History** | Preisverlauf 7d/30d/90d | `/coins/{id}/market_chart` |
| **Technische Indikatoren** | RSI, SMA(20/50), EMA(12/26), MACD, Bollinger Bands | Berechnet aus OHLC |
| **CoinGecko Trending** | Top 7 trending Coins der letzten 24h | `/search/trending` |
| **Fear & Greed Index** | Marktstimmung (0-100, z.B. "Extreme Fear") | `alternative.me/fng/` |
| **Crypto News** | Headlines via RSS (Cointelegraph, Messari) | RSS Feeds parsen |
| **Lessons** | Erkenntnisse aus vergangenen Runden | DB (Analysis-Tabelle) |

### Neue Lib-Dateien
- `src/lib/indicators.ts` — Berechnung von RSI, SMA, EMA, MACD, Bollinger Bands aus OHLC-Daten
- `src/lib/sentiment.ts` — Fear & Greed Index + Trending Coins + News Headlines abrufen

## KI Trading-Loop (alle 5 Minuten)

1. **Marktdaten holen** - CoinGecko `/coins/markets` für Top-10 Coins
2. **OHLC + History holen** - Candlestick-Daten für gehaltene/beobachtete Coins
3. **Technische Indikatoren berechnen** - RSI, MACD, Bollinger Bands, SMA/EMA
4. **Sentiment laden** - Fear & Greed Index + Trending Coins + News Headlines
5. **Portfolio laden** - Cash-Balance + Holdings mit aktuellen Preisen
6. **Lessons laden** - Erkenntnisse aus vergangenen Runden
7. **KI aufrufen (OpenRouter)** - Alle Daten + Portfolio + Lessons → JSON-Response parsen
8. **Validieren & Ausführen** - Prüfen ob genug Cash/Holdings, dann DB-Updates
9. **Snapshot speichern** - Portfolio-Wert für Chart
10. **Bust prüfen** - Wenn Gesamtwert < €2: Runde beenden → Analyse → neue Runde

## KESt-Berechnung
- Nur bei Verkauf mit Gewinn: `profit = (sellPrice - avgBuyPrice) * amount`
- KESt = `profit * 0.275`
- Wird sofort vom Erlös abgezogen

## Lern-System
1. Alle Transaktionen + Snapshots + Statistiken sammeln (Win-Rate, Max Drawdown, beste/schlechteste Trades)
2. KI (OpenRouter) analysiert den kompletten Rundenverlauf
3. Speichert: Zusammenfassung, Lessons, Fehler, Strategien
4. Bei jeder neuen Runde werden alle bisherigen Lessons in den System-Prompt injiziert

---

## Fortschritt

### Phase 1: Projekt-Setup
- [x] Next.js Projekt initialisieren (TypeScript, Tailwind, App Router)
- [x] Dependencies installieren: `@prisma/client`, `openai`, `recharts`, `swr`
- [x] Prisma Schema + SQLite erstellen, `db push`, Seed-Script
- [x] Types definieren (`src/types/index.ts`)

### Phase 2: Backend-Kernlogik
- [x] `coingecko.ts` - API-Client mit Cache (60s) und Rate-Limiting (Markets, OHLC, History)
- [x] `indicators.ts` - Technische Indikatoren (RSI, SMA, EMA, MACD, Bollinger Bands)
- [x] `sentiment.ts` - Fear & Greed Index, Trending Coins, News RSS
- [x] `tax.ts` - KESt-Berechnung
- [x] `portfolio.ts` - Portfolio-State-Berechnung
- [x] `ai.ts` - OpenRouter-Client, Trading-Entscheidungen + Analyse
- [x] `trader.ts` - Tick-Orchestrierung, Buy/Sell-Execution, Bust-Detection

### Phase 3: Lern-System
- [x] `learning.ts` - Statistik-Berechnung, Analyse-Generierung, Lessons-Formatierung

### Phase 4: API-Routes
- [x] Daten-APIs: `/api/portfolio`, `/api/transactions`, `/api/market`, `/api/rounds`
- [x] Trader-APIs: `/api/trader/run`, `/api/trader/status`
- [x] `scheduler.ts` + Next.js Instrumentation für Auto-Start

### Phase 5: Frontend
- [x] Layout (Dark Theme) + Globals
- [x] SWR-Hooks + Dashboard-Container
- [x] Komponenten: PortfolioSummary, HoldingsTable, MarketTicker, TransactionLog, TraderStatus, TaxSummary, PnLChart, RoundInfo
- [x] Runden-Detailseite (`/rounds/[id]`)

### Phase 6: Feinschliff
- [x] Error-Handling (API-Ausfälle → Tick überspringen, Retry)
- [ ] `.env.local` konfigurieren (`OPENROUTER_API_KEY`)

## Verifizierung
1. `npm run dev` starten
2. Dashboard öffnen → Portfolio-Zusammenfassung, Marktdaten sichtbar
3. Manuellen Trade-Tick auslösen via "Trade"-Button
4. Prüfen: Transaktion erscheint, Holdings aktualisiert, KESt korrekt berechnet
5. Scheduler laufen lassen → automatische Trades alle 5 Min
6. Runde bis zum Bust laufen lassen → Analyse wird generiert
7. Neue Runde startet → Lessons im Prompt vorhanden
