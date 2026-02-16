import { NextResponse } from "next/server";
import { getSchedulerStatus, startScheduler, stopScheduler } from "@/lib/scheduler";
import { prisma } from "@/lib/db";

const isVercel = !!process.env.VERCEL;
let autoStartAttempted = false; // Only auto-start once

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

  // Auto-start scheduler in dev only on first call (not on every poll)
  const schedulerStatus = getSchedulerStatus();
  if (!schedulerStatus.isRunning && !autoStartAttempted) {
    autoStartAttempted = true;
    // Start scheduler asynchronously to avoid blocking the response
    setTimeout(() => {
      console.log("[AUTO-START] Starting scheduler on first load");
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
    autoStartAttempted = true; // Mark as manually started
    startScheduler();
    return NextResponse.json({ message: "Scheduler gestartet", ...getSchedulerStatus() });
  } else if (action === "stop") {
    autoStartAttempted = true; // Prevent auto-restart after manual stop
    stopScheduler();
    return NextResponse.json({ message: "Scheduler gestoppt", ...getSchedulerStatus() });
  }

  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}
