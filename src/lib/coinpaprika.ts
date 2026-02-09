import type { CoinMarketData, OHLCDataPoint } from "@/types";

const BASE_URL = "https://api.coinpaprika.com/v1";
const CACHE_TTL = 120_000; // 2 minutes cache
const MIN_REQUEST_INTERVAL = 5000; // 5s between requests (conservative for 20k/month limit)

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

// Static mapping: CoinGecko ID → CoinPaprika ID
const COINGECKO_TO_PAPRIKA: Record<string, string> = {
  bitcoin: "btc-bitcoin",
  ethereum: "eth-ethereum",
  solana: "sol-solana",
  ripple: "xrp-xrp",
  cardano: "ada-cardano",
  dogecoin: "doge-dogecoin",
  "shiba-inu": "shib-shiba-inu",
  polkadot: "dot-polkadot-new",
  chainlink: "link-chainlink",
  avalanche: "avax-avalanche",
  tron: "trx-tron",
  litecoin: "ltc-litecoin",
  "matic-network": "matic-polygon",
  polygon: "matic-polygon",
  uniswap: "uni-uniswap",
  stellar: "xlm-stellar",
  cosmos: "atom-cosmos",
  "quant-network": "qnt-quant",
  zilliqa: "zil-zilliqa",
  "zilliqa-2": "zil-zilliqa",
  hedera: "hbar-hedera",
  "hedera-hashgraph": "hbar-hedera",
  vechain: "vet-vechain",
  "the-sandbox": "sand-the-sandbox",
  aave: "aave-new",
  algorand: "algo-algorand",
  "internet-computer": "icp-internet-computer",
  filecoin: "fil-filecoin",
  aptos: "apt-aptos",
  arbitrum: "arb-arbitrum",
  optimism: "op-optimism",
  sui: "sui-sui",
  near: "near-near-protocol",
  injective: "inj-injective",
  render: "render-render",
  "render-token": "render-render",
  pepe: "pepe-pepe",
  bonk: "bonk-bonk",
  floki: "floki-floki-inu",
  kaspa: "kas-kaspa",
  "binancecoin": "bnb-binance-coin",
  "staked-ether": "steth-lido-staked-ether",
};

// Lazy-loaded full ticker list for fallback mapping
let tickerListCache: { data: Record<string, string>; timestamp: number } | null = null;
const TICKER_LIST_TTL = 3600_000; // 1 hour

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const waitTime = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime));
  if (waitTime > 0) {
    await new Promise((r) => setTimeout(r, waitTime));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url);
  if (res.ok) return res;
  if (res.status === 429) {
    console.warn("[CoinPaprika] Rate limited (429)");
  }
  throw new Error(`CoinPaprika API error: ${res.status} ${res.statusText}`);
}

async function resolveId(geckoId: string): Promise<string | null> {
  // Try static mapping first
  const staticId = COINGECKO_TO_PAPRIKA[geckoId];
  if (staticId) return staticId;

  // Lazy-load full ticker list
  if (!tickerListCache || Date.now() - tickerListCache.timestamp > TICKER_LIST_TTL) {
    try {
      const res = await rateLimitedFetch(`${BASE_URL}/tickers`);
      const tickers = await res.json();
      const mapping: Record<string, string> = {};
      for (const t of tickers) {
        // Map by lowercase name (e.g. "bitcoin" → "btc-bitcoin")
        mapping[t.name.toLowerCase().replace(/\s+/g, "-")] = t.id;
        // Also map by symbol
        mapping[t.symbol.toLowerCase()] = t.id;
      }
      tickerListCache = { data: mapping, timestamp: Date.now() };
    } catch (err) {
      console.warn("[CoinPaprika] Failed to load ticker list:", err);
      return null;
    }
  }

  return tickerListCache.data[geckoId] || null;
}

interface PaprikaTicker {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  quotes: {
    EUR: {
      price: number;
      volume_24h: number;
      percent_change_24h: number;
      market_cap: number;
      ath_price: number;
    };
  };
}

/**
 * Fetch market data from CoinPaprika for coins that CoinGecko couldn't provide.
 */
export async function getMarketDataFallback(
  missingCoinIds: string[]
): Promise<CoinMarketData[]> {
  if (missingCoinIds.length === 0) return [];

  const cacheKey = `paprika:markets:${missingCoinIds.join(",")}`;
  const cached = getCached<CoinMarketData[]>(cacheKey);
  if (cached) return cached;

  // Resolve CoinGecko IDs to CoinPaprika IDs
  const idMap = new Map<string, string>(); // paprikaId → geckoId
  for (const geckoId of missingCoinIds) {
    const paprikaId = await resolveId(geckoId);
    if (paprikaId) {
      idMap.set(paprikaId, geckoId);
      console.log(`[CoinPaprika] ID-Mapping: ${geckoId} → ${paprikaId}`);
    } else {
      console.warn(`[CoinPaprika] Kein Mapping für: ${geckoId}`);
    }
  }

  if (idMap.size === 0) return [];

  try {
    console.log(`[CoinPaprika] Tickers anfragen für ${idMap.size} Coins (quotes=EUR)`);
    const res = await rateLimitedFetch(`${BASE_URL}/tickers?quotes=EUR`);
    const tickers: PaprikaTicker[] = await res.json();
    console.log(`[CoinPaprika] Tickers Response: ${tickers.length} Coins gesamt`);

    const paprikaIds = new Set(idMap.keys());
    const matched = tickers.filter((t) => paprikaIds.has(t.id));

    const result: CoinMarketData[] = matched.map((t) => ({
      id: idMap.get(t.id)!, // Use original CoinGecko ID
      symbol: t.symbol.toLowerCase(),
      name: t.name,
      current_price: t.quotes.EUR.price,
      price_change_percentage_24h: t.quotes.EUR.percent_change_24h,
      market_cap: t.quotes.EUR.market_cap,
      total_volume: t.quotes.EUR.volume_24h,
      ath: t.quotes.EUR.ath_price,
      atl: 0, // CoinPaprika doesn't provide ATL
      image: "",
    }));

    if (result.length > 0) {
      const details = result.map((r) => `${r.id} (${r.symbol})=€${r.current_price}`).join(", ");
      console.log(`[CoinPaprika] Fallback erfolgreich: ${details}`);
    } else {
      const searched = [...idMap.entries()].map(([p, g]) => `${g}→${p}`).join(", ");
      console.log(`[CoinPaprika] Fallback: keine Treffer (gesucht: ${searched})`);
    }

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`[CoinPaprika] Fallback Marktdaten fehlgeschlagen: ${(err as Error).message}`);
    return [];
  }
}

interface PaprikaOHLC {
  time_open: string;
  time_close: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  market_cap: number;
}

/**
 * Fetch OHLC data from CoinPaprika as fallback.
 */
export async function getOHLCFallback(
  coinId: string
): Promise<OHLCDataPoint[]> {
  const cacheKey = `paprika:ohlc:${coinId}`;
  const cached = getCached<OHLCDataPoint[]>(cacheKey);
  if (cached) return cached;

  const paprikaId = await resolveId(coinId);
  if (!paprikaId) {
    console.warn(`[CoinPaprika] OHLC: kein Mapping für ${coinId}`);
    return [];
  }

  try {
    console.log(`[CoinPaprika] OHLC anfragen für ${coinId} (→ ${paprikaId})`);
    const res = await rateLimitedFetch(
      `${BASE_URL}/coins/${paprikaId}/ohlcv/latest/`
    );
    const raw: PaprikaOHLC[] = await res.json();

    const data: OHLCDataPoint[] = raw.map((d) => ({
      timestamp: new Date(d.time_open).getTime(),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    console.log(`[CoinPaprika] OHLC Response für ${coinId}: ${data.length} Datenpunkte`);
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`[CoinPaprika] OHLC fehlgeschlagen für ${coinId} (${paprikaId}): ${(err as Error).message}`);
    return [];
  }
}
