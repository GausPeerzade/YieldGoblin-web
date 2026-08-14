/**
 * Reads a public env var, treating blank as absent.
 *
 * `process.env.NEXT_PUBLIC_*` is a runtime object in the browser, not an
 * inlined literal, and an unset key can arrive as `""` — which sails straight
 * through `??` and silently overrides the intended default. Always route
 * NEXT_PUBLIC_ reads through here.
 */
export function env(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
