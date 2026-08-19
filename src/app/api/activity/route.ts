import { NextResponse } from "next/server";

import { activityToWire } from "@/lib/wire";
import { getGlobalActivity } from "@/server/history";

/** Merged activity feed across every visible vault. */
export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=30, stale-while-revalidate=120";

export async function GET() {
  try {
    const activity = await getGlobalActivity();
    return NextResponse.json(
      { activity: activity.map(activityToWire) },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch {
    return NextResponse.json({ error: "activity unavailable" }, { status: 502 });
  }
}
