const { chromium } = require("playwright");
const path = require("node:path");
const FX = path.join(__dirname, "..", "fixtures") + path.sep;
const SHOTS = process.env.SHOTS || path.join(require("node:os").tmpdir(), "review-shots");
require("node:fs").mkdirSync(SHOTS, { recursive: true });
const S = n => path.join(SHOTS, n);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(process.env.BASE || "http://127.0.0.1:5173");
  const ready = async () => { await page.waitForTimeout(150); await page.getByText("Bereit", { exact: true }).waitFor(); await page.waitForTimeout(100); };
  const svg = page.locator('svg[aria-label^="Netzwerkgraph"]');
  const node = id => page.locator(`[data-graph-node-id="${id}"] circle[r="16"]`);
  const center = async id => { const b = await node(id).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, r: b.width / 2 }; };
  const drag = async (id, x, y) => { const c = await center(id); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(x, y, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(100); };
  await page.locator('input[type="file"][accept*=".graphml"]').setInputFiles(FX + "topohub_mini.json"); await ready();
  await page.getByRole("button", { name: /Bonsai \(Greedy\)/ }).click(); await ready();
  await svg.screenshot({ path: S("p2_arrow_100.png") });
  // arrow geometry report
  const arrows = async () => page.evaluate(() => [...document.querySelectorAll("line[marker-end]")].map(l => { const g = l.closest("g[role=button]").getAttribute("aria-label"); const x1 = +l.getAttribute("x1"), y1 = +l.getAttribute("y1"), x2 = +l.getAttribute("x2"), y2 = +l.getAttribute("y2"); return `${g}: len=${Math.hypot(x2 - x1, y2 - y1).toFixed(1)}`; }));
  console.log("arrows default:", JSON.stringify(await arrows()));
  // short edge: drag node 1 next to node 0 (35 px screen apart -> overlapping), then 60 px
  const c0 = await center("0");
  await drag("1", c0.x - 60, c0.y + 10); await svg.screenshot({ path: S("p2_arrow_short60.png") }); console.log("arrows 60px apart:", JSON.stringify(await arrows()));
  await drag("1", c0.x - 40, c0.y + 5);  // hmm may grab node 0 if overlapping; fine
  await svg.screenshot({ path: S("p2_arrow_short40.png") }); console.log("arrows ~40px apart:", JSON.stringify(await arrows()));
  await page.getByRole("button", { name: "Knotenpositionen zurücksetzen" }).click();
  // zoom out to 50 %
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Herauszoomen" }).click();
  await page.waitForTimeout(100); await svg.screenshot({ path: S("p2_arrow_050.png") });
  // tooltip at 50%: hover a non-labelled node at border. Drag node 2 to bottom-left corner then hover
  const r = await svg.boundingBox();
  await drag("2", r.x + 5, r.y + r.height - 5); const c2 = await center("2"); await page.mouse.move(c2.x + 3, c2.y - 3); await page.waitForTimeout(150);
  const tip = await page.locator("svg g[aria-hidden=true] rect").boundingBox().catch(() => null);
  console.log("tooltip at 50 % bottom-left corner:", JSON.stringify(tip), "svg", JSON.stringify(r), tip ? "inside=" + (tip.x >= r.x && tip.y >= r.y && tip.x + tip.width <= r.x + r.width && tip.y + tip.height <= r.y + r.height) : "");
  await svg.screenshot({ path: S("p2_tooltip_050_corner.png") });
  await drag("2", r.x + r.width - 5, r.y + 300); const c2b = await center("2"); await page.mouse.move(c2b.x - 3, c2b.y); await page.waitForTimeout(150);
  const tip2 = await page.locator("svg g[aria-hidden=true] rect").boundingBox().catch(() => null);
  console.log("tooltip at 50 % right border:", JSON.stringify(tip2), tip2 ? "inside=" + (tip2.x >= r.x && tip2.x + tip2.width <= r.x + r.width) : "");
  await svg.screenshot({ path: S("p2_tooltip_050_right.png") });
  await page.getByRole("button", { name: "Knotenpositionen zurücksetzen" }).click();
  await page.getByRole("button", { name: "Topologie einpassen" }).click();
  // zoom in on a tree arrow target (node 0) to 300%
  const t = await center("0"); await page.mouse.move(t.x - 60, t.y); for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(30); }
  await svg.screenshot({ path: S("p2_arrow_zoomed.png") }); console.log("zoom:", await page.locator("output").innerText());
  // failure marker after drag (bonsai) + failed edge arrow
  await page.getByRole("button", { name: "Topologie einpassen" }).click(); await page.waitForTimeout(100);
  // 50 nodes bonsai
  await page.locator('input[type="file"][accept*=".graphml"]').setInputFiles(FX + "synthetic_50_nodes_dense.json"); await ready();
  await page.getByRole("button", { name: /Bonsai \(Greedy\)/ }).click(); await ready();
  await svg.screenshot({ path: S("p2_arrow_dense_bonsai.png") });
  console.log("dense arrows with len<=38 (arrow ends at midpoint):", (await arrows()).filter(a => parseFloat(a.split("len=")[1]) < 25).length, "of", (await arrows()).length);
  console.log("errors", JSON.stringify(errors));
  await browser.close();
})();
