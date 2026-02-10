# Plan: Trading Rules Anpassungen

## Context
Der AI Crypto Trader soll verbessert werden: besseres KI-Modell, höherer Mindesteinsatz, 24h-Analyse-Zyklus mit gewichteten Erkenntnissen, 3-Tage-Rundenlimit mit Verdopplungsziel, und alle Analysen pro Runde im UI sichtbar. Aktuell werden Analysen nur bei Bust erstellt und es gibt nur 1 Analyse pro Runde — das neue System lernt kontinuierlich alle 24h und zeigt die komplette Analyse-Historie. FreqAI-Integration wird als mögliche Phase 2 zurückgestellt.

## Fortschritt
- [x] 1. KI-Modell auf DeepSeek V3 umstellen
- [x] 2. Mindesteinsatz auf €50 erhöhen
- [x] 3. Prisma-Schema: Analysis 1:n statt 1:1
- [x] 4. 24h-Analyse-Zyklus implementieren
- [x] 5. Gewichtete Lessons
- [x] 6. 3-Tage-Rundenlimit + Verdopplungsziel
- [x] 7. UI: Alle Analysen pro Runde anzeigen
- [x] 8. System-Prompt aktualisieren
- [x] 9. Build + Test
- [x] 10. CoinPaprika als Fallback-Datenquelle
- [x] 11. CoinID-Resolution (Symbol-Matching + On-Demand-Fetch)
- [x] 12. Sell-Minimum: kleine Positionen < €50 immer liquidierbar
- [x] 13. 24h-Analyse: eigener Prompt (Zwischenbericht, nicht Rundenende)
- [x] 14. UI: Accordion, PnL-Chart, kompakter KI-Trader, Runden-Paginierung

---

### 1. KI-Modell: DeepSeek V3 als primäres Trading-Modell
**Datei:** `src/lib/ai.ts`

DeepSeek V3 hat in Crypto-Trading-Benchmarks die besten Ergebnisse erzielt. Auf OpenRouter als `deepseek/deepseek-chat-v3.1` verfügbar.

- `FREE_MODELS` Array: DeepSeek V3.1 → Qwen → OpenRouter Free
- Temperature von `0.7` auf `0.4` gesenkt (diszipliniertere Entscheidungen)

### 2. Mindesteinsatz auf €50
**Dateien:** `src/lib/trader.ts`, `src/lib/ai.ts`

- `MIN_TRADE_EUR` von `5` auf `50`
- System-Prompt: `Minimaler Trade: €50`

### 3. Prisma-Schema: Analysis 1:n statt 1:1
**Datei:** `prisma/schema.prisma`

- `roundId Int @unique` → `roundId Int` (unique entfernt)
- Neues Feld `type String @default("bust")` — "bust" | "periodic" | "final"
- Round-Relation: `analysis Analysis?` → `analyses Analysis[]`
- Migration: `allow-multiple-analyses`

### 4. 24h-Analyse-Zyklus (zeitbasiert im Tick)
**Dateien:** `src/lib/learning.ts`, `src/lib/trader.ts`

Neue Funktionen in `learning.ts`:
- `shouldRunPeriodicAnalysis(roundId)` — prüft ob letzte Analyse > 24h alt
- `createPeriodicAnalysis(roundId)` — erstellt Zwischen-Analyse mit type "periodic"

Trigger in `trader.ts` nach Snapshot-Speicherung (Step 10b).

### 5. Gewichtete Lessons
**Dateien:** `src/lib/learning.ts`, `src/lib/ai.ts`

- Letzte 3 Analysen nach createdAt desc
- Prefix-Tags: `[AKTUELL]`, `[VORHERIG]`, `[ÄLTER]`
- System-Prompt erklärt Gewichtungsregeln

### 6. 3-Tage-Rundenlimit + Verdopplungsziel
**Dateien:** `src/lib/trader.ts`, `src/lib/ai.ts`

- `MAX_ROUND_HOURS = 72`
- Verdopplung (totalValue >= startBalance * 2) → status "completed" + finale Analyse + neue Runde
- Zeitlimit (>= 72h) → status "expired" + finale Analyse + neue Runde
- Round-Status: `active` | `busted` | `completed` | `expired`
- `roundCreatedAt` als Parameter an `getTradeDecisions()` übergeben
- User-Prompt zeigt verbleibende Zeit

### 7. UI: Alle Analysen pro Runde anzeigen

- **Types** (`src/types/index.ts`): Neues `AnalysisEntry` Interface, `RoundWithAnalysis.analyses` Array
- **API** (`src/app/api/rounds/route.ts`): `analyses[]` mit type + createdAt
- **RoundInfo** (`src/components/RoundInfo.tsx`): Status-Badges (Aktiv/Completed/Expired/Bust), Analyse-Anzahl
- **Round-Detail** (`src/app/rounds/[id]/page.tsx`): Timeline aller Analysen mit Typ-Badges (24h=blau, Final=grün, Bust=rot)

### 8. System-Prompt aktualisieren
**Datei:** `src/lib/ai.ts`

- Ziel: "Kapital innerhalb von 3 Tagen verdoppeln (€1.000 → €2.000)"
- Minimaler Trade: €50
- Gewichtete Lessons-Erklärung
- Verbleibende Zeit im User-Prompt

---

### 10. CoinPaprika als Fallback-Datenquelle
**Dateien:** `src/lib/coinpaprika.ts` (NEU), `src/lib/coingecko.ts`

CoinGecko liefert für einige Coins keine Preise (Rate Limits, Daten-Lücken). CoinPaprika (20k calls/Monat, kein API Key) als automatischer Fallback:
- Neues Modul `coinpaprika.ts` mit Cache, Rate-Limiting, ID-Mapping (CoinGecko → CoinPaprika)
- `getMarketDataFallback()` — für Coins ohne CoinGecko-Preis
- `getOHLCFallback()` — OHLC-Daten bei CoinGecko-Fehler
- Integration in `coingecko.ts`: `getMarketData()` merged fehlende Coins, `getOHLC()` nutzt Fallback im catch-Block

## Betroffene Dateien
1. `prisma/schema.prisma` — Analysis 1:n, neues `type` Feld
2. `src/lib/ai.ts` — Modell-Liste, Temperature, System-Prompt, `roundCreatedAt` Parameter
3. `src/lib/trader.ts` — MIN_TRADE_EUR, 24h-Analyse-Trigger, 3-Tage-Limit, Verdopplungs-Check
4. `src/lib/learning.ts` — shouldRunPeriodicAnalysis, createPeriodicAnalysis, gewichtete Lessons, type-Feld
5. `src/types/index.ts` — `AnalysisEntry` Interface, `RoundWithAnalysis.analyses` Array
6. `src/app/api/rounds/route.ts` — `analyses[]` mit orderBy + type
7. `src/components/RoundInfo.tsx` — Neue Status-Badges, `analyses[0]?.summary`, Analyse-Anzahl
8. `src/app/rounds/[id]/page.tsx` — Timeline aller Analysen statt einzelnem Block
