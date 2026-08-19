import { NextResponse } from "next/server";
import type { Address } from "viem";

import { vaultToWire } from "@/lib/wire";
import { getReadModel, getVault } from "@/server/registry";

/**
 * The vault list, served from the server-side read model.
 *
 * `s-maxage` makes the CDN the shared cache: every visitor worldwide hits the
 * edge, and the origin — and therefore the RPC — is touched once per TTL.
 * `stale-while-revalidate` keeps responses instant while a refresh happens in
 * the background. Public data only; wallet state never flows through here.
 */
export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=15, stale-while-revalidate=60";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // A vault created seconds ago may not be in the cached list yet; `ensure`
  // verifies it against the factory and includes it without waiting for TTL.
  const ensure = searchParams.get("ensure");

  try {
    const vaults = await getReadModel();

    if (ensure && /^0x[0-9a-fA-F]{40}$/.test(ensure)) {
      const present = vaults.some(
        (v) => v.address.toLowerCase() === ensure.toLowerCase(),
      );
      if (!present) {
        const extra = await getVault(ensure as Address);
        if (extra) vaults.push(extra);
      }
    }

    return NextResponse.json(
      { vaults: vaults.map(vaultToWire), updatedAt: Date.now() },
      { headers: { "Cache-Control": CACHE } },
    );
  } catch {
    return NextResponse.json({ error: "read model unavailable" }, { status: 502 });
  }
}
