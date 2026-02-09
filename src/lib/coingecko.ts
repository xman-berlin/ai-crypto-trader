import type { CoinMarketData, OHLCDataPoint, PriceHistoryPoint } from "@/types";
import { getMarketDataFallback, getOHLCFallback } from "./coinpaprika";

const BASE_URL = "https://api.coingecko.com/api/v3";
const CACHE_TTL = 120_000; // 2 minutes cache
const MIN_REQUEST_INTERVAL = 4000; // 4s between requests (safe for serverless, ~15 req/min)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
let lastRequestTime = 0;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const waitTime = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime));
  if (waitTime > 0) {
    await new Promise((r) => setTimeout(r, waitTime));
  }
  lastRequestTime = Date.now();

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (res.status === 429) {
      // Exponential backoff: 10s, 25s, 45s
      const delay = (attempt + 1) * 10000 + Math.random() * 5000;
      console.warn(`CoinGecko 429, waiting ${(delay / 1000).toFixed(1)}s...`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }
  throw new Error("CoinGecko API: max retries exceeded (429)");
}

export async function getMarketData(
  coinIds: string[],
  currency = "eur"
): Promise<CoinMarketData[]> {
  const cacheKey = `markets:${coinIds.join(",")}:${currency}`;
  const cached = getCached<CoinMarketData[]>(cacheKey);
  if (cached) return cached;

  const ids = coinIds.join(",");
  const url = `${BASE_URL}/coins/markets?vs_currency=${currency}&ids=${ids}&order=market_cap_desc&sparkline=false`;
  console.log(`[CoinGecko] Marktdaten anfragen für ${coinIds.length} Coins: ${coinIds.join(", ")}`);
  const res = await rateLimitedFetch(url);
  const data: CoinMarketData[] = await res.json();

  // Check which requested coins are missing or have no price
  const returnedIds = new Set(
    data.filter((d) => d.current_price && d.current_price > 0).map((d) => d.id)
  );
  const receivedCoins = data.map((d) => `${d.id}=€${d.current_price ?? 0}`);
  console.log(`[CoinGecko] Response: ${returnedIds.size}/${coinIds.length} Coins mit Preis — ${receivedCoins.join(", ")}`);

  const missingIds = coinIds.filter((id) => !returnedIds.has(id));

  if (missingIds.length > 0) {
    console.log(`[CoinGecko] Fehlend: ${missingIds.join(", ")} → CoinPaprika Fallback`);
    const fallbackData = await getMarketDataFallback(missingIds);
    if (fallbackData.length > 0) {
      data.push(...fallbackData);
    } else {
      console.log(`[CoinPaprika] Kein Fallback-Ergebnis für: ${missingIds.join(", ")}`);
    }
  }

  setCache(cacheKey, data);
  return data;
}

export async function getOHLC(
  coinId: string,
  days = 7,
  currency = "eur"
): Promise<OHLCDataPoint[]> {
  const cacheKey = `ohlc:${coinId}:${days}:${currency}`;
  const cached = getCached<OHLCDataPoint[]>(cacheKey);
  if (cached) return cached;

  try {
    console.log(`[CoinGecko] OHLC anfragen für ${coinId} (${days} Tage)`);
    const url = `${BASE_URL}/coins/${coinId}/ohlc?vs_currency=${currency}&days=${days}`;
    const res = await rateLimitedFetch(url);
    const raw: number[][] = await res.json();

    const data: OHLCDataPoint[] = raw.map(([timestamp, open, high, low, close]) => ({
      timestamp,
      open,
      high,
      low,
      close,
    }));

    console.log(`[CoinGecko] OHLC Response für ${coinId}: ${data.length} Datenpunkte`);
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`[CoinGecko] OHLC fehlgeschlagen für ${coinId}: ${(err as Error).message} → CoinPaprika Fallback`);
    const fallbackData = await getOHLCFallback(coinId);
    if (fallbackData.length > 0) {
      console.log(`[CoinPaprika] OHLC Fallback für ${coinId}: ${fallbackData.length} Datenpunkte`);
      setCache(cacheKey, fallbackData);
    } else {
      console.log(`[CoinPaprika] OHLC Fallback für ${coinId}: keine Daten`);
    }
    return fallbackData;
  }
}

export async function getPriceHistory(
  coinId: string,
  days = 30,
  currency = "eur"
): Promise<PriceHistoryPoint[]> {
  const cacheKey = `history:${coinId}:${days}:${currency}`;
  const cached = getCached<PriceHistoryPoint[]>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`;
  const res = await rateLimitedFetch(url);
  const raw = await res.json();

  const data: PriceHistoryPoint[] = raw.prices.map(([timestamp, price]: [number, number]) => ({
    timestamp,
    price,
  }));

  setCache(cacheKey, data);
  return data;
}

export async function getTrendingCoins(): Promise<
  { id: string; name: string; symbol: string }[]
> {
  const cacheKey = "trending";
  const cached = getCached<{ id: string; name: string; symbol: string }[]>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/search/trending`;
  const res = await rateLimitedFetch(url);
  const raw = await res.json();

  const data = raw.coins.map(
    (c: { item: { id: string; name: string; symbol: string } }) => ({
      id: c.item.id,
      name: c.item.name,
      symbol: c.item.symbol,
    })
  );

  setCache(cacheKey, data);
  return data;
}
