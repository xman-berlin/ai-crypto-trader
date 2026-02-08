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
    message: string;
    actions: string[];
    success: boolean;
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
      setLastResult({
        message: data.message ?? data.error ?? "Unbekannt",
        actions: data.actions ?? [],
        success: data.success ?? false,
      });
      onRefresh();
    } catch (e) {
      setLastResult({
        message: `Fehler: ${(e as Error).message}`,
        actions: [],
        success: false,
      });
    } finally {
      setTickLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
      <h2 className="mb-4 text-lg font-semibold">KI-Trader</h2>
      <div className="flex items-center gap-4">
        <div
          className={`h-3 w-3 rounded-full ${
            status.isRunning ? "bg-[var(--green)]" : "bg-[var(--muted)]"
          }`}
        />
        <span>{status.isRunning ? "Aktiv" : "Gestoppt"}</span>
        <span className="text-sm text-[var(--muted)]">
          Intervall: {(status.interval / 1000 / 60).toFixed(0)} Min
        </span>
      </div>

      {status.lastTick && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Letzter Tick: {new Date(status.lastTick).toLocaleString("de-DE")}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          onClick={toggleScheduler}
          disabled={loading}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
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
          className="rounded-md bg-[var(--accent)]/20 px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/30 disabled:opacity-50"
        >
          {tickLoading ? "Trading..." : "Manueller Trade"}
        </button>
      </div>

      {lastResult && (
        <div className="mt-3 rounded-md bg-[var(--background)] p-3 text-sm space-y-2">
          <p className={lastResult.success ? "text-[var(--green)]" : "text-[var(--red)]"}>
            {lastResult.message}
          </p>
          {lastResult.actions.length > 0 && (
            <ul className="space-y-1 text-[var(--muted)]">
              {lastResult.actions.map((a, i) => (
                <li key={i} className="break-words">• {a}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
