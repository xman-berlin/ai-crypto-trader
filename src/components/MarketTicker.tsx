"use client";

import type { CoinMarketData } from "@/types";

export default function MarketTicker({
  marketData,
}: {
  marketData: CoinMarketData[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {marketData.map((coin) => (
        <div
          key={coin.id}
          className="rounded-md border border-[var(--card-border)] p-3"
        >
          <div className="flex items-center gap-2">
            {coin.image && (
              <img
                src={coin.image}
                alt={coin.name}
                className="h-5 w-5"
              />
            )}
            <span className="text-sm font-medium">{coin.symbol.toUpperCase()}</span>
          </div>
          <p className="mt-1 text-base sm:text-lg font-bold">€{coin.current_price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p
            className={`text-sm ${
              (coin.price_change_percentage_24h ?? 0) >= 0
                ? "text-[var(--green)]"
                : "text-[var(--red)]"
            }`}
          >
            {(coin.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
            {(coin.price_change_percentage_24h ?? 0).toFixed(1)}%
          </p>
        </div>
      ))}
    </div>
  );
}
