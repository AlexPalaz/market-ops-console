/**
 * Records the product walkthrough: drives the production build with Playwright,
 * captures frames through the Chrome DevTools screencast, overlays the narration
 * as captions inside the page, and writes the frame list + an SRT with the cue
 * timings so a voice-over can be recorded against the same timeline.
 *
 *   node scripts/walkthrough/record.mjs http://localhost:3200 /tmp/walkthrough
 *
 * Then: node scripts/walkthrough/encode.mjs /tmp/walkthrough docs/walkthrough/walkthrough.mp4
 */
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "https://market-ops-console-two.vercel.app";
const OUT = process.argv[3] ?? "/tmp/walkthrough";
const WORDS_PER_SECOND = 2.2; // comfortable read-aloud pace
const VIEWPORT = { width: 1440, height: 810 };

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(path.join(OUT, "frames"), { recursive: true });

/** The alert created during the walkthrough lives in server memory: remove leftovers. */
async function cleanAlerts() {
  try {
    const res = await fetch(BASE + "/api/alerts");
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body.alerts ?? []);
    for (const a of list.filter((a) => a.name === "Germany under plan")) {
      await fetch(`${BASE}/api/alerts/${a.id}`, { method: "DELETE" });
    }
  } catch (e) {
    console.warn("alert cleanup skipped:", e.message);
  }
}

await cleanAlerts();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 4 / 3, // 1440×810 → 1920×1080
  colorScheme: "light",
  reducedMotion: "no-preference",
});
const page = await context.newPage();

// Caption bar + drawn cursor, injected before any script of the page runs.
await page.addInitScript(() => {
  const mount = () => {
    const style = document.createElement("style");
    style.textContent = `
      #wt-cap { position: fixed; left: 50%; bottom: 36px; transform: translateX(-50%);
        max-width: 820px; padding: 12px 18px; border-radius: 4px; z-index: 2147483000;
        background: var(--ink); color: var(--paper); font: 500 19px/1.45 var(--font-sans, ui-sans-serif, system-ui);
        letter-spacing: 0.005em; text-align: center; text-wrap: balance; pointer-events: none;
        opacity: 0; transition: opacity 180ms ease; box-shadow: 0 1px 0 var(--signal) inset; }
      #wt-cap.on { opacity: 1; }
      #wt-cur { position: fixed; left: 0; top: 0; width: 14px; height: 21px; z-index: 2147483001;
        pointer-events: none; transform: translate(-9999px, -9999px);
        filter: drop-shadow(0 1px 1px rgba(0,0,0,.35)); }
      #wt-bar { position: fixed; left: 0; top: 0; right: 0; height: 44px; z-index: 2147483000;
        display: flex; align-items: center; gap: 10px; padding: 0 14px; box-sizing: border-box;
        background: #ececec; border-bottom: 1px solid #c9c9c9; font: 13px/1 -apple-system, system-ui, sans-serif; color: #333; }
      #wt-bar .dots { display: flex; gap: 8px; margin-right: 6px; }
      #wt-bar .dots i { width: 12px; height: 12px; border-radius: 50%; display: block; }
      #wt-bar .nav { display: flex; gap: 2px; margin-right: 4px; }
      #wt-bar .nav button { width: 28px; height: 28px; border: 0; background: transparent; border-radius: 6px; color: #555; font-size: 18px; line-height: 1; }
      #wt-bar .nav button.go { background: #d6d6d6; }
      #wt-bar .url { flex: 1; height: 30px; display: flex; align-items: center; gap: 8px; padding: 0 12px;
        background: #fff; border: 1px solid #d0d0d0; border-radius: 8px; color: #222; white-space: nowrap; overflow: hidden; }
      #wt-bar .url .q { color: #666; }
      #wt-bar .url.hl .q { background: #ffe8d6; color: #000; border-radius: 3px; outline: 3px solid #ffe8d6; transition: background 150ms; }
      body { padding-top: 44px !important; }
      header[class*="sticky"] { top: 44px !important; }
      #wt-rip { position: fixed; left: 0; top: 0; width: 36px; height: 36px; margin: -18px 0 0 -18px;
        border-radius: 50%; border: 2px solid var(--signal); z-index: 2147483001; pointer-events: none;
        opacity: 0; transform: scale(0.3); }
      #wt-rip.go { animation: wt-rip 420ms ease-out; }
      @keyframes wt-rip { 0% { opacity: .9; transform: scale(.3);} 100% { opacity: 0; transform: scale(1.1);} }
    `;
    document.head.appendChild(style);
    const cap = document.createElement("div");
    cap.id = "wt-cap";
    const cur = document.createElement("div");
    cur.id = "wt-cur";
    cur.innerHTML =
      '<svg viewBox="0 0 14 21" width="14" height="21"><path d="M1 1v16.2l4.1-3.9 2.7 6.3 2.9-1.3-2.7-6.2h5.4z" fill="#000" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
    const rip = document.createElement("div");
    rip.id = "wt-rip";
    const bar = document.createElement("div");
    bar.id = "wt-bar";
    bar.innerHTML =
      '<div class="dots"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>' +
      '<div class="nav"><button id="wt-back" aria-hidden="true">‹</button><button aria-hidden="true">›</button></div>' +
      '<div class="url" id="wt-url"><svg width="11" height="13" viewBox="0 0 11 13"><rect x="1" y="5.5" width="9" height="7" rx="1.5" fill="#777"/><path d="M3 5.5V4a2.5 2.5 0 0 1 5 0v1.5" fill="none" stroke="#777" stroke-width="1.4"/></svg><span></span></div>';
    bar.setAttribute("aria-hidden", "true");
    document.body.append(bar, cap, cur, rip);
    const urlEl = bar.querySelector("#wt-url span");
    let lastHref = "";
    const syncUrl = () => {
      if (location.href === lastHref) return;
      lastHref = location.href;
      const u = new URL(location.href);
      urlEl.innerHTML =
        u.host + u.pathname + (u.search ? '<span class="q">' + u.search + "</span>" : "");
    };
    syncUrl();
    setInterval(syncUrl, 80);
    window.__wtUrlHighlight = (on) => bar.querySelector("#wt-url").classList.toggle("hl", on);
    window.__wtBack = (on) => bar.querySelector("#wt-back").classList.toggle("go", on);
    document.addEventListener(
      "mousemove",
      (e) => {
        cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      },
      true,
    );
    document.addEventListener(
      "mousedown",
      (e) => {
        rip.style.left = `${e.clientX}px`;
        rip.style.top = `${e.clientY}px`;
        rip.classList.remove("go");
        void rip.offsetWidth;
        rip.classList.add("go");
      },
      true,
    );
    window.__wtCaption = (text) => {
      if (!text) {
        cap.classList.remove("on");
        return;
      }
      cap.textContent = text;
      cap.classList.add("on");
    };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
});

// ---- screencast ----------------------------------------------------------
const cdp = await context.newCDPSession(page);
const frames = []; // { file, ts } with ts in seconds since epoch
let frameNo = 0;
const pendingWrites = [];
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  const file = path.join(OUT, "frames", `f${String(frameNo++).padStart(6, "0")}.jpg`);
  frames.push({ file, ts: metadata.timestamp });
  pendingWrites.push(fs.writeFile(file, Buffer.from(data, "base64")));
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});

// ---- helpers --------------------------------------------------------------
const cues = [];
const now = () => Date.now() / 1000;
const sleep = (ms) => page.waitForTimeout(ms);
const words = (t) => t.trim().split(/\s+/).length;

async function caption(text) {
  await page.evaluate((t) => window.__wtCaption(t), text);
}

/** Show a caption, run the action, and hold until the line can be read aloud. */
async function cue(text, action, { hold = 0, pause = 700 } = {}) {
  const start = now();
  await caption(text);
  await sleep(pause);
  const need = Math.max(3000, (words(text) / WORDS_PER_SECOND) * 1000 + 900) + hold;
  if (action) await action();
  const elapsed = (now() - start) * 1000;
  if (elapsed < need) await sleep(need - elapsed);
  cues.push({ text, start, end: now() });
  console.log(`${fmtClock(start)}  ${text}`);
}

function fmtClock(s) {
  const d = new Date(s * 1000);
  return d.toISOString().slice(11, 19);
}

async function moveTo(locator, { steps = 28, dx = 0, dy = 0 } = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("no box for " + locator);
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps });
}

async function click(locator, opts) {
  await locator.scrollIntoViewIfNeeded();
  await moveTo(locator, opts);
  await sleep(180);
  await locator.click();
}

/** Smooth-scroll so the element's top sits just under the sticky header. */
async function scrollTo(locator, { offset = 84 } = {}) {
  await locator.evaluate((el, off) => {
    const top = el.getBoundingClientRect().top + window.scrollY - off;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, offset);
  await sleep(800);
}

async function scrollTop() {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(800);
}

const group = (name) => page.getByRole("group", { name });

// ---- the walkthrough -----------------------------------------------------
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^Germany,/ }).waitFor();
await page.mouse.move(720, 400);
await cdp.send("Page.startScreencast", {
  format: "jpeg",
  quality: 92,
  maxWidth: 1920,
  maxHeight: 1080,
  everyNthFrame: 1,
});
const t0 = now();
await sleep(1200);

await cue(
  "Hi everyone, and welcome to Market Ops Console. It's a dashboard designed to help sales teams track performance, using the data from the provided dataset.",
  async () => {
    await page.mouse.move(640, 300, { steps: 40 });
  },
);

await cue(
  "Let's start with the executive view. This gives us a quick overview of the entire portfolio, with four key metrics: revenue, growth, forecast performance, and markets at risk.",
  async () => {
    const kpis = page.getByRole("list", { name: "Headline KPIs" });
    const items = kpis.getByRole("listitem");
    for (let i = 0; i < 4; i++) {
      await moveTo(items.nth(i), { steps: 22 });
      await sleep(450);
    }
  },
  { pause: 1600 },
);

await cue(
  "Here we have the map. The darker the colour, the higher the revenue. Each country is interactive, and you can navigate using a mouse, keyboard, or screen reader.",
  async () => {
    await scrollTo(group("Markets map"), { offset: 96 });
    for (const name of [/^United States,/, /^Brazil,/, /^Japan,/]) {
      await moveTo(page.getByRole("button", { name }), { steps: 24 });
      await sleep(650);
    }
  },
);

await cue(
  "Let's select Germany. The map zooms into Europe, and the entire dashboard updates to show Germany's data.",
  async () => {
    await click(page.getByRole("button", { name: /^Germany,/ }));
    await page.getByRole("heading", { level: 1 }).filter({ hasText: "Germany" }).waitFor();
    await sleep(900);
    await scrollTop();
  },
);

await cue(
  "Our selection is also reflected in the URL, which means we can share this exact view or use the browser's back button to navigate.",
  async () => {
    await page.mouse.move(520, 22, { steps: 30 });
    await page.evaluate(() => window.__wtUrlHighlight(true));
    await sleep(2600);
    await page.evaluate(() => window.__wtUrlHighlight(false));
    await page.mouse.move(96, 22, { steps: 24 });
    await sleep(400);
    await page.evaluate(() => window.__wtBack(true));
    await page.mouse.down();
    await page.mouse.up();
    await page.goBack();
    await sleep(250);
    await page.evaluate(() => window.__wtBack(false));
    await page.getByRole("heading", { level: 1 }).filter({ hasText: "Portfolio" }).waitFor();
    await scrollTop();
    await sleep(400);
  },
);

await cue(
  "Moving on to the time-series chart, we can compare actual revenue against the forecast and the previous year. The selected month is highlighted, and anomalies are marked in orange.",
  async () => {
    const ts = group("Actual vs forecast vs prior year");
    await scrollTo(ts, { offset: 96 });
    const box = await ts.boundingBox();
    const y = box.y + box.height * 0.55;
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 20 });
    await page.mouse.move(box.x + box.width * 0.85, y, { steps: 70 });
  },
);

await cue(
  "On the right, we have the markets that need attention and the biggest movers, all based on the same dataset. The product table lets us explore the details further.",
  async () => {
    await scrollTo(group("Top movers"), { offset: 96 });
    await sleep(600);
    await moveTo(group("Top movers"), { steps: 20 });
  },
);

await cue(
  "Now let's look at the AI assistant. It's powered by a mock backend and streams responses using the provided API contract.",
  async () => {
    await scrollTop();
    await click(page.getByRole("button", { name: "Germany's dip" }));
  },
);

await cue(
  "As you can see, the response appears progressively. We can stop the generation at any point, and the content already received remains visible.",
  async () => {
    await page.getByText("High confidence", { exact: true }).waitFor({ timeout: 30_000 });
  },
);

const evidence = page.getByRole("region", { name: "Evidence from the dataset" });
await cue(
  "Once the response is complete, we can explore the supporting evidence. Each source is validated against the dataset, and we also display a confidence indicator.",
  async () => {
    await evidence.scrollIntoViewIfNeeded();
    await moveTo(evidence, { steps: 24 });
  },
);

await cue(
  "By clicking Show, we're taken directly to the relevant market and period. This connects the assistant's insights to the actual data behind them.",
  async () => {
    await click(
      evidence.getByRole("button", {
        name: "Show Germany, Mar 2026 (largest dip) on the dashboard",
      }),
    );
    await page.getByRole("heading", { level: 1 }).filter({ hasText: "Germany" }).waitFor();
    await sleep(600);
    await moveTo(page.getByRole("list", { name: "Headline KPIs" }).getByRole("listitem").first());
  },
);

await cue(
  "Let's switch to the analyst view. Here we get more detailed information, including this heatmap showing market performance across different months.",
  async () => {
    await click(page.getByRole("radio", { name: "Analyst deep-dive" }));
    await page.getByRole("grid", { name: /heat map/ }).waitFor();
    await sleep(500);
    await scrollTo(group("Markets × months"), { offset: 96 });
  },
);

await cue(
  "By default, the heatmap shows year-over-year growth: red cells are below last year, green cells are above. We can also switch to the forecast view.",
  async () => {
    for (const p of ["Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026"]) {
      await moveTo(page.getByRole("gridcell", { name: new RegExp(`^Germany, ${p}`) }), {
        steps: 14,
      });
      await sleep(520);
    }
  },
);

await cue(
  "When I hover over a cell, the corresponding month is highlighted in the time-series chart. I can also navigate with the arrow keys and press Enter to select.",
  async () => {
    const cell = page.getByRole("gridcell", { name: /^Germany, Jan 2026/ });
    await moveTo(cell, { steps: 12 });
    await cell.focus();
    for (const key of ["ArrowRight", "ArrowRight", "ArrowDown", "ArrowUp"]) {
      await sleep(420);
      await page.keyboard.press(key);
    }
    await sleep(420);
    await page.keyboard.press("Enter");
  },
);

await cue(
  "Next is the comparison view, where we can compare regions or markets using a radar chart. Each metric is normalized to a scale from zero to one hundred.",
  async () => {
    const radar = group("Compare across KPIs");
    await scrollTo(radar, { offset: 96 });
    const toggles = radar.getByRole("group", { name: "Entities to compare" }).getByRole("button");
    const n = await toggles.count();
    for (let i = 0; i < n; i++) {
      const t = toggles.nth(i);
      const pressed = await t.getAttribute("aria-pressed");
      const disabled = await t.isDisabled();
      if (pressed !== "true" && !disabled) {
        await click(t);
        break;
      }
    }
  },
);

await cue(
  "Finally, we have the alert configuration. The form validates our inputs, and when we create a rule, it appears immediately while the server saves it.",
  async () => {
    const alerts = group("Alerts");
    await scrollTo(alerts, { offset: 96 });
    await click(page.getByRole("button", { name: "New alert" }));
    const dialog = page.getByRole("dialog", { name: "New alert" });
    await dialog.waitFor();
    await sleep(400);
    await click(dialog.getByRole("button", { name: "Save alert" }));
    await sleep(900);
    await click(dialog.getByLabel("Alert name"));
    await dialog.getByLabel("Alert name").pressSequentially("Germany under plan", { delay: 45 });
    await click(dialog.getByLabel("Growth YoY is below (%)"));
    await dialog.getByLabel("Growth YoY is below (%)").pressSequentially("0", { delay: 60 });
    await sleep(300);
    await click(dialog.getByRole("button", { name: "Save alert" }));
    await page.getByText("Germany under plan").first().waitFor();
    await sleep(900);
  },
);

await cue(
  "If the request fails, the change is automatically rolled back, and the user receives a clear explanation.",
  async () => {
    await click(page.getByRole("button", { name: "New alert" }));
    const dialog = page.getByRole("dialog", { name: "New alert" });
    await dialog.waitFor();
    await click(dialog.getByLabel("Alert name"));
    await dialog.getByLabel("Alert name").pressSequentially("fail: rollback demo", { delay: 40 });
    await click(dialog.getByLabel("Growth YoY is below (%)"));
    await dialog.getByLabel("Growth YoY is below (%)").pressSequentially("5", { delay: 60 });
    await click(dialog.getByRole("button", { name: "Save alert" }));
    await page.getByText("Alert not saved").waitFor({ timeout: 10_000 });
    await sleep(1200);
  },
);

await cue(
  "Every chart also provides an accessible table alternative. Both light and dark themes have been checked for accessibility, including contrast and keyboard navigation.",
  async () => {
    const ts = group("Actual vs forecast vs prior year");
    await scrollTo(ts, { offset: 96 });
    await click(ts.getByRole("button", { name: "View as table" }));
    await sleep(1400);
    await click(ts.getByRole("button", { name: "View as chart" }));
    await sleep(300);
    await scrollTop();
    await click(page.getByRole("button", { name: "Switch to dark theme" }));
    await sleep(600);
  },
);

await cue(
  "To wrap things up, the project includes ninety-one unit tests, ten end-to-end tests, an automated CI pipeline, and a perfect Lighthouse score. Thanks for watching!",
  async () => {
    await page.mouse.move(700, 420, { steps: 40 });
  },
  { hold: 1500 },
);

await caption("");
await sleep(1500);
await cdp.send("Page.stopScreencast");
await Promise.all(pendingWrites);
await browser.close();
await cleanAlerts();

// ---- outputs ---------------------------------------------------------------
const base = frames[0]?.ts ?? t0;
const lines = [];
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? frames[i + 1].ts - frames[i].ts : 1.5;
  lines.push(`file '${frames[i].file}'`, `duration ${Math.max(0.001, d).toFixed(4)}`);
}
if (frames.length) lines.push(`file '${frames.at(-1).file}'`);
await fs.writeFile(path.join(OUT, "frames.txt"), lines.join("\n") + "\n");

const srt = cues
  .map((c, i) => `${i + 1}\n${srtTime(c.start - base)} --> ${srtTime(c.end - base)}\n${c.text}\n`)
  .join("\n");
await fs.writeFile(path.join(OUT, "walkthrough.srt"), srt);
await fs.writeFile(
  path.join(OUT, "script.txt"),
  cues.map((c) => `[${srtTime(c.start - base).slice(0, 8)}] ${c.text}`).join("\n\n") + "\n",
);
console.log(
  `\n${frames.length} frames, ${(frames.at(-1).ts - base) | 0} s, ${cues.length} cues → ${OUT}`,
);

function srtTime(s) {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}
