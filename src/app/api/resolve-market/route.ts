import { NextResponse } from "next/server";

import { resolveMarket } from "@/server/market-resolver";

/**
 * Validates a pasted Limitless link and returns deployable `createVault` args.
 *
 * POST because it is a lookup with side-effect-free but non-trivial cost
 * (several chain reads plus an upstream fetch), and because it must never be
 * CDN-cached per URL — the answer depends on live chain state.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let input: string;
  try {
    const body = (await request.json()) as { url?: string };
    input = (body.url ?? "").toString();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected a JSON body with a `url` field." }, { status: 400 });
  }

  if (!input.trim()) {
    return NextResponse.json(
      { ok: false, checks: [], error: "Paste a Limitless market link to continue." },
      { status: 400 },
    );
  }
  if (input.length > 500) {
    return NextResponse.json(
      { ok: false, checks: [], error: "That link is too long to be a market URL." },
      { status: 400 },
    );
  }

  try {
    const result = await resolveMarket(input);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { ok: false, checks: [], error: "Couldn't reach Limitless or the chain. Try again in a moment." },
      { status: 502 },
    );
  }
}
