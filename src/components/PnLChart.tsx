"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Snapshot {
  totalValue: number;
  cash: number;
  createdAt: string;
}

export default function PnLChart({
  snapshots,
  startBalance,
}: {
  snapshots: Snapshot[];
  startBalance: number;
}) {
  if (snapshots.length < 2) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Portfolio-Verlauf</h2>
        <p className="text-[var(--muted)]">Noch nicht genug Daten für den Chart</p>
      </div>
    );
  }

  const firstTime = new Date(snapshots[0].createdAt).getTime();
  const lastTime = new Date(snapshots[snapshots.length - 1].createdAt).getTime();
  const spanHours = (lastTime - firstTime) / (1000 * 60 * 60);

  const data = snapshots.map((s) => ({
    time: new Date(s.createdAt).toLocaleString("de-DE",
      spanHours > 24
        ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
        : { hour: "2-digit", minute: "2-digit" }
    ),
    value: parseFloat(s.totalValue.toFixed(2)),
  }));

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
      <h2 className="mb-4 text-lg font-semibold">Portfolio-Verlauf</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis
            dataKey="time"
            stroke="var(--muted)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="var(--muted)"
            tick={{ fontSize: 12 }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
            }}
            formatter={(value) => [`€${Number(value).toFixed(2)}`, "Wert"]}
          />
          <ReferenceLine
            y={startBalance}
            stroke="var(--muted)"
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
