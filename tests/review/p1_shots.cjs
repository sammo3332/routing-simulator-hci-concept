const { chromium } = require("playwright");
const path = require("node:path");
const FX = path.join(__dirname, "..", "fixtures") + path.sep;
const SHOTS = process.env.SHOTS || path.join(require("node:os").tmpdir(), "review-shots");
require("node:fs").mkdirSync(SHOTS, { recursive: true });
const S = n => path.join(SHOTS, n);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(process.env.BASE || "http://127.0.0.1:5173");
  const ready = async () => { await page.waitForTimeout(150); await page.getByText("Bereit", { exact: true }).waitFor(); await page.waitForTimeout(100); };
  const main = page.locator("main > section").first();
  const sel = i => page.locator("aside select").nth(i);
  await page.locator('input[type="file"][accept*=".graphml"]').setInputFiles(FX + "synthetic_50_nodes_dense.json"); await ready();
  // fail 3 edges via the Kante select + button
  const edgeSelect = page.locator("aside select").nth(3);
  const opts = await edgeSelect.locator("option").evaluateAll(o => o.map(x => x.value));
  for (const v of [opts[0], opts[10], opts[25], opts[40]]) { await edgeSelect.selectOption(v); await page.getByRole("button", { name: /Ausgewählte Kante ausfallen lassen/ }).click(); await ready(); }
  await main.screenshot({ path: S("p1_dense_failures_all.png") });
  await sel(2).selectOption("__hide_routes__"); await page.waitForTimeout(100); await main.screenshot({ path: S("p1_dense_failures_none.png") });
  const src = (await sel(2).locator("option").evaluateAll(o => o.map(x => x.value)))[20];
  await sel(2).selectOption(src); await page.waitForTimeout(100); await main.screenshot({ path: S("p1_dense_failures_single.png") });
  await page.getByRole("button", { name: /Bonsai \(Greedy\)/ }).click(); await ready();
  await sel(2).selectOption(""); await page.waitForTimeout(100); await main.screenshot({ path: S("p1_dense_failures_bonsai.png") });
  await sel(2).selectOption("__hide_routes__"); await page.waitForTimeout(100); await main.screenshot({ path: S("p1_dense_bonsai_none.png") });
  // colour census of drawn base strokes vs legend
  const census = await page.evaluate(() => { const m = {}; document.querySelectorAll("svg[aria-label^=Netzwerkgraph] line").forEach(l => { const s = getComputedStyle(l); if (s.stroke === "rgba(0, 0, 0, 0)") return; const k = s.stroke + (s.strokeDasharray !== "none" ? " dash" : "") + (l.getAttribute("marker-end") ? " arrow" : ""); m[k] = (m[k] || 0) + 1; }); return m; });
  console.log("bonsai + 'Keine Route hervorheben' strokes:", JSON.stringify(census));
  console.log("legend:", (await page.locator("text=Legende").locator("..").innerText()).replace(/\s+/g, " "));
  await browser.close();
})();
