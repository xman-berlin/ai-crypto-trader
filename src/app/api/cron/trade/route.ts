import { NextResponse } from "next/server";
import { executeTick } from "@/lib/trader";
import { waitUntil } from "@vercel/functions";

export async function GET(request: Request) {
  // Verify Cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run tick in background, respond immediately
  waitUntil(executeTick().catch((e) => console.error("Cron tick error:", e)));

  return NextResponse.json({ success: true, message: "Tick gestartet" });
}
