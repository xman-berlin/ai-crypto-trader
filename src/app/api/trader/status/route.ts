import { NextResponse } from "next/server";
import { getSchedulerStatus, startScheduler, stopScheduler } from "@/lib/scheduler";
import { prisma } from "@/lib/db";

const isVercel = !!process.env.VERCEL;

export async function GET() {
  // Last tick always from DB (reliable across scheduler, manual ticks, and Vercel cron)
  const lastSnapshot = await prisma.snapshot.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const lastTick = lastSnapshot?.createdAt.toISOString() ?? null;

  if (isVercel) {
    return NextResponse.json({
      isRunning: true,
      lastTick,
      nextTick: null,
      interval: 300_000,
      mode: "vercel-cron",
    });
  }

  // Auto-start scheduler in dev if not running (non-blocking)
  const schedulerStatus = getSchedulerStatus();
  if (!schedulerStatus.isRunning) {
    // Start scheduler asynchronously to avoid blocking the response
    setTimeout(() => {
      console.log("[AUTO-START] Starting scheduler");
      startScheduler();
    }, 100);
  }

  return NextResponse.json({ ...schedulerStatus, lastTick });
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
