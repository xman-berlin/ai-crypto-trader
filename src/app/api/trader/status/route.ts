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

  // Check trader enabled status from DB
  const traderEnabledConfig = await prisma.config.findUnique({
    where: { key: "traderEnabled" },
  });
  const traderEnabled = traderEnabledConfig?.value !== "false"; // Default true if not set

  if (isVercel) {
    return NextResponse.json({
      isRunning: traderEnabled,
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
  const body = await request.json();
  const { action } = body;

  if (isVercel) {
    // On Vercel, control trader via DB config instead of local scheduler
    if (action === "start") {
      await prisma.config.upsert({
        where: { key: "traderEnabled" },
        create: { key: "traderEnabled", value: "true" },
        update: { value: "true" },
      });
      return NextResponse.json({
        message: "Trader aktiviert (wird beim nächsten Cron-Tick ausgeführt)",
        mode: "vercel-cron",
        isRunning: true,
      });
    } else if (action === "stop") {
      await prisma.config.upsert({
        where: { key: "traderEnabled" },
        create: { key: "traderEnabled", value: "false" },
        update: { value: "false" },
      });
      return NextResponse.json({
        message: "Trader gestoppt (Cron läuft weiter, aber Trading pausiert)",
        mode: "vercel-cron",
        isRunning: false,
      });
    }
  }

  // Local dev: control scheduler directly
  if (action === "start") {
    autoStartAttempted = true; // Mark as manually started
    startScheduler();
    // Also set DB flag for consistency
    await prisma.config.upsert({
      where: { key: "traderEnabled" },
      create: { key: "traderEnabled", value: "true" },
      update: { value: "true" },
    });
    return NextResponse.json({ message: "Scheduler gestartet", ...getSchedulerStatus() });
  } else if (action === "stop") {
    autoStartAttempted = true; // Prevent auto-restart after manual stop
    stopScheduler();
    // Also set DB flag for consistency
    await prisma.config.upsert({
      where: { key: "traderEnabled" },
      create: { key: "traderEnabled", value: "false" },
      update: { value: "false" },
    });
    return NextResponse.json({ message: "Scheduler gestoppt", ...getSchedulerStatus() });
  }

  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}
