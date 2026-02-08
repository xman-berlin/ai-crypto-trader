import { NextResponse } from "next/server";
import { getSchedulerStatus, startScheduler, stopScheduler } from "@/lib/scheduler";

const isVercel = !!process.env.VERCEL;

export async function GET() {
  if (isVercel) {
    // On Vercel, cron handles scheduling — return cron-based status
    return NextResponse.json({
      isRunning: true,
      lastTick: null,
      nextTick: null,
      interval: 300_000,
      mode: "vercel-cron",
    });
  }
  return NextResponse.json(getSchedulerStatus());
}

export async function POST(request: Request) {
  if (isVercel) {
    return NextResponse.json(
      { error: "Scheduler wird auf Vercel via Cron gesteuert" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { action } = body;

  if (action === "start") {
    startScheduler();
    return NextResponse.json({ message: "Scheduler gestartet", ...getSchedulerStatus() });
  } else if (action === "stop") {
    stopScheduler();
    return NextResponse.json({ message: "Scheduler gestoppt", ...getSchedulerStatus() });
  }

  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}
