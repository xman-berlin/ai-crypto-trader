import { NextResponse } from "next/server";
import { getSchedulerStatus, startScheduler, stopScheduler } from "@/lib/scheduler";

export async function GET() {
  return NextResponse.json(getSchedulerStatus());
}

export async function POST(request: Request) {
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
