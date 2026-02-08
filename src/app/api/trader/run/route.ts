import { NextResponse } from "next/server";
import { executeTick } from "@/lib/trader";

export async function POST() {
  try {
    const result = await executeTick();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
