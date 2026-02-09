// === Market Data ===

export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  ath: number;
  atl: number;
  image: string;
}

export interface OHLCDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

// === Technical Indicators ===

export interface TechnicalIndicators {
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  } | null;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
}

// === Sentiment ===

export interface SentimentData {
  fearGreedIndex: {
    value: number;
    classification: string;
  } | null;
  trendingCoins: { id: string; name: string; symbol: string }[];
  newsHeadlines: string[];
}

// === Portfolio ===

export interface PortfolioState {
  roundId: number;
  cash: number;
  holdings: HoldingWithValue[];
  totalValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface HoldingWithValue {
  coinId: string;
  coinName: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

// === AI Trading ===

export interface TradeDecision {
  action: "buy" | "sell" | "hold";
  coinId: string;
  coinName: string;
  amount: number; // amount in EUR for buy, amount of coin for sell
  reasoning: string;
}

export interface AIResponse {
  decisions: TradeDecision[];
  marketAnalysis: string;
}

// === Round Analysis ===

export interface RoundAnalysis {
  summary: string;
  lessons: string[];
  mistakes: string[];
  strategies: string[];
}

// === API Response Types ===

export interface TraderStatus {
  isRunning: boolean;
  lastTick: string | null;
  nextTick: string | null;
  interval: number;
}

export interface AnalysisEntry {
  type: string;
  summary: string;
  lessons: string[];
  mistakes: string[];
  strategies: string[];
  createdAt: string;
}

export interface RoundWithAnalysis {
  id: number;
  startBalance: number;
  status: string;
  createdAt: string;
  endedAt: string | null;
  analyses: AnalysisEntry[];
  transactionCount: number;
  finalValue: number | null;
}
