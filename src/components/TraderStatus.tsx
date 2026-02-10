"use client";

import { useState } from "react";
import type { TraderStatus as TraderStatusType } from "@/types";

export default function TraderStatus({
  status,
  onRefresh,
}: {
  status: TraderStatusType;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [tickLoading, setTickLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  async function toggleScheduler() {
    setLoading(true);
    try {
      const action = status.isRunning ? "stop" : "start";
      await fetch("/api/trader/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      onRefresh();
    } finally {
      setLoading(false);
    }
  }

  async function triggerTick() {
    setTickLoading(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/trader/run", { method: "POST" });
      const data = await res.json();
      setLastResult({ success: data.success ?? false, error: data.success ? undefined : (data.error ?? data.message) });
      onRefresh();
    } catch (e) {
      setLastResult({ success: false, error: (e as Error).message });
    } finally {
      setTickLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
      <h2 className="mb-3 text-lg font-semibold">KI-Trader</h2>
      <div className="flex items-center gap-3 text-sm">
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            status.isRunning ? "bg-[var(--green)]" : "bg-[var(--muted)]"
          }`}
        />
        <span>{status.isRunning ? "Aktiv" : "Gestoppt"}</span>
        <span className="text-[var(--muted)]">
          · {(status.interval / 1000 / 60).toFixed(0)} Min
        </span>
      </div>

      {status.lastTick && (
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          Letzter Versuch: {new Date(status.lastTick).toLocaleString("de-DE")}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={toggleScheduler}
          disabled={loading}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            status.isRunning
              ? "bg-[var(--red)]/20 text-[var(--red)] hover:bg-[var(--red)]/30"
              : "bg-[var(--green)]/20 text-[var(--green)] hover:bg-[var(--green)]/30"
          } disabled:opacity-50`}
        >
          {loading ? "..." : status.isRunning ? "Stop" : "Start"}
        </button>
        <button
          onClick={triggerTick}
          disabled={tickLoading}
          className="rounded-md bg-[var(--accent)]/20 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/30 disabled:opacity-50"
        >
          {tickLoading ? "Trading..." : "Manueller Trade"}
        </button>
      </div>

      {lastResult && !lastResult.success && lastResult.error && (
        <p className="mt-2 text-xs text-[var(--red)]">
          {lastResult.error}
        </p>
      )}
    </div>
  );
}
