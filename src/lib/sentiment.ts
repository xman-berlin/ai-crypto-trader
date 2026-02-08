import type { SentimentData } from "@/types";
import { getTrendingCoins } from "./coingecko";

export async function getSentimentData(): Promise<SentimentData> {
  const [fearGreed, trending, news] = await Promise.allSettled([
    fetchFearGreedIndex(),
    getTrendingCoins(),
    fetchNewsHeadlines(),
  ]);

  return {
    fearGreedIndex:
      fearGreed.status === "fulfilled" ? fearGreed.value : null,
    trendingCoins:
      trending.status === "fulfilled" ? trending.value : [],
    newsHeadlines:
      news.status === "fulfilled" ? news.value : [],
  };
}

async function fetchFearGreedIndex(): Promise<{
  value: number;
  classification: string;
}> {
  const res = await fetch("https://api.alternative.me/fng/?limit=1");
  if (!res.ok) throw new Error("Fear & Greed API error");
  const data = await res.json();
  const entry = data.data[0];
  return {
    value: parseInt(entry.value, 10),
    classification: entry.value_classification,
  };
}

async function fetchNewsHeadlines(): Promise<string[]> {
  try {
    // Use CoinTelegraph RSS
    const res = await fetch(
      "https://cointelegraph.com/rss"
    );
    if (!res.ok) return [];
    const text = await res.text();

    // Simple XML title extraction
    const titles: string[] = [];
    const regex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
    let match;
    while ((match = regex.exec(text)) !== null && titles.length < 10) {
      titles.push(match[1]);
    }

    // Fallback: try without CDATA
    if (titles.length === 0) {
      const simpleRegex = /<item>[\s\S]*?<title>(.*?)<\/title>/g;
      while (
        (match = simpleRegex.exec(text)) !== null &&
        titles.length < 10
      ) {
        titles.push(match[1]);
      }
    }

    return titles;
  } catch {
    return [];
  }
}
