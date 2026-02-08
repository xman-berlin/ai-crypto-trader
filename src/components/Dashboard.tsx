"use client";

import { useState } from "react";
import useSWR from "swr";
import PortfolioSummary from "./PortfolioSummary";
import HoldingsTable from "./HoldingsTable";
import MarketTicker from "./MarketTicker";
import TransactionLog from "./TransactionLog";
import TraderStatus from "./TraderStatus";
import TaxSummary from "./TaxSummary";
import PnLChart from "./PnLChart";
import RoundInfo from "./RoundInfo";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Dashboard() {
  const [txPage, setTxPage] = useState(1);

  const { data: portfolio, mutate: mutatePortfolio } = useSWR(
    "/api/portfolio",
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { data: market } = useSWR("/api/market", fetcher, {
    refreshInterval: 60_000,
  });
  const { data: txData, mutate: mutateTransactions } = useSWR(
    `/api/transactions?page=${txPage}&pageSize=10`,
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { data: allTxData } = useSWR(
    "/api/transactions?pageSize=10000",
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { data: traderStatus, mutate: mutateStatus } = useSWR(
    "/api/trader/status",
    fetcher,
    { refreshInterval: 10_000 }
  );
  const { data: rounds } = useSWR("/api/rounds", fetcher, {
    refreshInterval: 60_000,
  });

  const isLoading = !portfolio || !market;
  const marketArray = Array.isArray(market) ? market : [];

  function handleRefresh() {
    mutatePortfolio();
    mutateTransactions();
    mutateStatus();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--muted)]">Dashboard wird geladen…</p>
      </div>
    );
  }

  if (portfolio?.error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--red)]">Fehler: {portfolio.error}</p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioSummary portfolio={portfolio} />
        </div>
        <TraderStatus status={traderStatus ?? { isRunning: false, lastTick: null, nextTick: null, interval: 300000 }} onRefresh={handleRefresh} />
      </div>

      <HoldingsTable holdings={portfolio.holdings ?? []} />

      <MarketTicker marketData={marketArray} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PnLChart snapshots={[]} startBalance={portfolio.totalValue ?? 1000} />
        <TaxSummary transactions={allTxData?.transactions ?? []} />
      </div>

      <TransactionLog
        transactions={txData?.transactions ?? []}
        page={txData?.page ?? 1}
        totalPages={txData?.totalPages ?? 1}
        total={txData?.total ?? 0}
        onPageChange={setTxPage}
      />

      <RoundInfo rounds={rounds ?? []} />
    </div>
  );
}
