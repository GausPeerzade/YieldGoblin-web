import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { C, GOBLIN, base } from "./shared.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "..");
mkdirSync(resolve(here, "tmp"), { recursive: true });

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Shown in the footer of every post card. Override when the domain is live:
 *  SITE_URL=yield-goblin-ui.vercel.app node brand/src/build.mjs */
const SITE = process.env.SITE_URL || "yield-goblin-ui.vercel.app";

/* ── 1. Profile picture — reads at 32px as well as 400px ─────────────────── */
const avatar = (bg, ring) => base(400, 400, `
  <div style="position:relative;width:400px;height:400px;background:${bg};
              display:grid;place-items:center;overflow:hidden">
    <div class="glow" style="width:340px;height:340px;background:${C.brand};opacity:.22"></div>
    <div style="position:absolute;inset:26px;border:2px solid ${ring};border-radius:50%"></div>
    <div style="position:relative;transform:translateY(4px)">${GOBLIN(286)}</div>
  </div>`);

/* ── 2. Banner — avatar overlays bottom-left, so keep that corner empty ──── */
const banner = base(1500, 500, `
  <div style="position:relative;width:1500px;height:500px;background:
       radial-gradient(1100px 420px at 50% 118%, #143026 0%, ${C.ink} 62%);
       display:grid;place-items:center;overflow:hidden">
    <div class="glow" style="width:620px;height:300px;background:${C.brand};
         opacity:.16;left:440px;top:-120px;position:absolute"></div>
    <div style="position:absolute;inset:0;
         background-image:radial-gradient(${C.line} 1px, transparent 1px);
         background-size:34px 34px;opacity:.5"></div>

    <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:22px">
      <div style="display:flex;align-items:center;gap:20px">
        ${GOBLIN(84)}
        <span style="font-size:66px;font-weight:700;letter-spacing:-2px">Yield Goblin</span>
      </div>
      <p style="font-size:27px;color:${C.muted};letter-spacing:-.2px">
        Earn USDC on the prediction-market shares you already hold
      </p>
      <div style="display:flex;gap:12px;margin-top:4px">
        <span class="chip"><span class="dot" style="background:${C.brand}"></span>Live on Base</span>
        <span class="chip">Non-custodial</span>
        <span class="chip">No lock-up</span>
      </div>
    </div>
  </div>`);

/* ── 3. Post cards, 16:9 ─────────────────────────────────────────────────── */
const post = (inner, opts = {}) => base(1600, 900, `
  <div style="position:relative;width:1600px;height:900px;
       background:radial-gradient(900px 700px at 82% 10%, #16332734 0%, ${C.ink} 60%);
       padding:88px 96px;display:flex;flex-direction:column;overflow:hidden">
    <div class="glow" style="width:520px;height:520px;background:${C.brand};
         opacity:${opts.glow ?? ".13"};right:-140px;top:-160px;position:absolute"></div>
    <header style="display:flex;align-items:center;gap:14px">
      ${GOBLIN(44)}
      <span style="font-size:28px;font-weight:650;letter-spacing:-.6px">Yield Goblin</span>
    </header>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">${inner}</div>
    <footer style="display:flex;justify-content:space-between;align-items:center;
            font-size:22px;color:${C.muted};border-top:1px solid ${C.line};padding-top:26px">
      <span>${opts.footL ?? SITE}</span>
      <span>${opts.footR ?? "Unaudited beta · use a test wallet"}</span>
    </footer>
  </div>`);

const H = (t, size = 82) =>
  `<h1 style="font-size:${size}px;line-height:1.08;letter-spacing:-2.6px;font-weight:700;max-width:20ch">${t}</h1>`;

const posts = {
  "post-01-idle": post(`
    ${H("Your prediction-market shares are sitting idle.")}
    <p style="font-size:82px;line-height:1.08;letter-spacing:-2.6px;font-weight:700;
              color:${C.brand};margin-top:14px">Now they earn USDC.</p>
    <p style="font-size:29px;color:${C.muted};margin-top:34px;max-width:34ch;line-height:1.5">
      Deposit the YES or NO shares you already hold. Your position stays exactly as it was.
    </p>`),

  "post-02-steps": post(`
    ${H("Three steps", 64)}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:46px">
      ${[
        ["01", "Get shares", "Buy YES or NO on a Limitless market, the same as you would anyway."],
        ["02", "Deposit them", "Put those shares into the vault for that market."],
        ["03", "Earn USDC", "Yield accrues continuously. Claim it whenever you like."],
      ].map(([n, t, b]) => `
        <div style="background:${C.panel};border:1px solid ${C.line};border-radius:22px;padding:34px">
          <span style="font-size:20px;font-weight:700;color:${C.brand};letter-spacing:1.4px">${n}</span>
          <p style="font-size:32px;font-weight:650;margin-top:14px;letter-spacing:-.8px">${t}</p>
          <p style="font-size:22px;color:${C.muted};margin-top:12px;line-height:1.5">${b}</p>
        </div>`).join("")}
    </div>`),

  "post-03-unchanged": post(`
    <p style="font-size:26px;color:${C.brand};font-weight:600;letter-spacing:1.6px;
              text-transform:uppercase;margin-bottom:24px">Your bet is untouched</p>
    ${H("Deposit YES.<br>Get YES back.")}
    <p style="font-size:30px;color:${C.muted};margin-top:34px;max-width:32ch;line-height:1.5">
      The same number of shares, with the same payoff when the market resolves.
      Yield arrives separately, in USDC.
    </p>`, { glow: ".1" }),

  "post-04-live": post(`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:26px">
      <span class="dot" style="background:${C.brand};width:13px;height:13px"></span>
      <span style="font-size:26px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;
                   color:${C.brand}">Live on Base</span>
    </div>
    ${H("The first vault is open.", 76)}
    <p style="font-size:30px;color:${C.muted};margin-top:30px;max-width:34ch;line-height:1.5">
      BTC Up or Down — Weekly, on Limitless. Deposit your shares and start earning.
    </p>
    <div style="display:flex;gap:12px;margin-top:44px">
      <span class="chip" style="font-size:22px;padding:12px 22px">Yield from Aave v3</span>
      <span class="chip" style="font-size:22px;padding:12px 22px">Non-custodial</span>
      <span class="chip" style="font-size:22px;padding:12px 22px">Withdraw any time</span>
    </div>`),
};

const assets = {
  "logo-dark": [avatar(C.ink, "rgba(22,192,120,.30)"), 400, 400],
  "logo-green": [avatar("#085334", "rgba(255,255,255,.26)"), 400, 400],
  "banner": [banner, 1500, 500],
  ...Object.fromEntries(Object.entries(posts).map(([k, v]) => [k, [v, 1600, 900]])),
};

for (const [name, [html, w, h]] of Object.entries(assets)) {
  const file = resolve(here, "tmp", `${name}.html`);
  writeFileSync(file, html);
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--force-device-scale-factor=2", `--window-size=${w},${h}`,
    `--screenshot=${resolve(out, name + ".png")}`, `file://${file}`,
  ], { stdio: "ignore" });
  console.log(`✓ ${name}.png  ${w * 2}×${h * 2}`);
}
