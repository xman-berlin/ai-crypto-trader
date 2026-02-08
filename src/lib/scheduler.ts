import { executeTick } from "./trader";

let intervalId: ReturnType<typeof setInterval> | null = null;
let lastTickTime: Date | null = null;
let isRunning = false;
let tickInterval = 300_000; // 5 minutes default

export function startScheduler(interval?: number): void {
  if (intervalId) return; // Already running

  if (interval) tickInterval = interval;
  isRunning = true;

  // Run first tick immediately
  runTick();

  intervalId = setInterval(runTick, tickInterval);
  console.log(`Scheduler started with ${tickInterval / 1000}s interval`);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  console.log("Scheduler stopped");
}

async function runTick(): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Running trade tick...`);
    const result = await executeTick();
    lastTickTime = new Date();
    console.log(`Tick result: ${result.message}`);
    result.actions.forEach((a) => console.log(`  - ${a}`));
  } catch (e) {
    console.error("Scheduler tick error:", e);
  }
}

export function getSchedulerStatus() {
  return {
    isRunning,
    lastTick: lastTickTime?.toISOString() ?? null,
    nextTick: isRunning && lastTickTime
      ? new Date(lastTickTime.getTime() + tickInterval).toISOString()
      : null,
    interval: tickInterval,
  };
}
