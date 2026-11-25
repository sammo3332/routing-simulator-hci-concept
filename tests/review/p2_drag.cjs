const { chromium } = require("playwright");
const path = require("node:path");
const BASE = process.env.BASE || "http://127.0.0.1:5173";
const FX = path.join(__dirname, "..", "fixtures") + path.sep;
const SHOTS = process.env.SHOTS || path.join(require("node:os").tmpdir(), "review-shots");
require("node:fs").mkdirSync(SHOTS, { recursive: true });
const S = n => path.join(SHOTS, n);
(async () => {
  const browser = await chromium.launch();
  for (const vp of [{ width: 900, height: 700 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const tag = `${vp.width}x${vp.height}`;
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
    const errors = []; page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
    let api = 0; page.on("request", r => { if (r.url().includes("/api/")) api++; });
    await page.goto(BASE);
    const ready = async () => { await page.waitForTimeout(150); await page.getByText("Bereit", { exact: true }).waitFor(); await page.waitForTimeout(100); };
    await page.locator('input[type="file"][accept*=".graphml"]').setInputFiles(FX + "topohub_mini.json"); await ready();
    const svg = page.locator('svg[aria-label^="Netzwerkgraph"]');
    const node = id => page.locator(`[data-graph-node-id="${id}"] circle[r="16"]`);
    const center = async id => { const b = await node(id).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, r: b.width / 2 }; };
    const zoomText = async () => (await page.locator("output").innerText()).trim();
    const table = async () => { const b = page.getByRole("button", { name: /Aufklappen/ }); if (await b.count()) await b.click(); const t = await page.locator("#routing-detail-panels table tbody").innerText(); await page.getByRole("button", { name: /Einklappen/ }).click(); return t; };
    const before = await table(); const apiBefore = api; const rect = await svg.boundingBox();
    const report = [];
    const inside = (c, m = 0) => c.x >= rect.x + m && c.x <= rect.x + rect.width - m && c.y >= rect.y + m && c.y <= rect.y + rect.height - m;
    // A: drag node 0 far beyond each border (grab at centre)
    for (const [name, dx, dy] of [["left", -3000, 0], ["right", 3000, 0], ["top", 0, -3000], ["bottom", 0, 3000]]) {
      const c = await center("0");
      await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(c.x + dx / 2, c.y + dy / 2, { steps: 3 }); await page.mouse.move(c.x + dx, c.y + dy, { steps: 1 }); await page.mouse.up(); await page.waitForTimeout(100);
      const a = await center("0");
      report.push(`${name}: centre ${inside(a) ? "inside" : "OUTSIDE"} (${Math.round(a.x - rect.x)},${Math.round(a.y - rect.y)} of ${Math.round(rect.width)}x${Math.round(rect.height)})`);
      if (name === "right" || name === "top") await page.screenshot({ path: S(`p2_${tag}_border_${name}.png`) });
    }
    console.log(tag, "A centre-grab borders:", report.join(" | "));
    // B: top-right corner (toolbar): is the node reachable?
    { const c = await center("0"); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(rect.x + rect.width - 60, rect.y + 25, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(100);
      const a = await center("0");
      const hit = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? (el.closest("[role=toolbar]") ? "toolbar" : el.closest("[data-graph-node-id]") ? "node" : el.tagName) : "none"; }, [a.x, a.y]);
      await page.screenshot({ path: S(`p2_${tag}_toolbar.png`) });
      // try to grab it again
      await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x - 200, a.y + 200, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(100);
      const a2 = await center("0");
      console.log(tag, "B node under toolbar: element at node centre =", hit, "| re-grab moved node:", Math.hypot(a2.x - a.x, a2.y - a.y) > 50);
      if (hit === "toolbar") { await page.getByRole("button", { name: "Topologie einpassen" }).click(); await page.waitForTimeout(150); const a3 = await center("0");
        const hit3 = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el?.closest("[role=toolbar]") ? "toolbar" : el?.closest("[data-graph-node-id]") ? "node" : el?.tagName; }, [a3.x, a3.y]);
        console.log(tag, "B after 'Einpassen': element at node centre =", hit3); await page.screenshot({ path: S(`p2_${tag}_toolbar_after_fit.png`) }); }
    }
    await page.getByRole("button", { name: "Knotenpositionen zurücksetzen" }).click(); await page.getByRole("button", { name: "Topologie einpassen" }).click(); await page.waitForTimeout(100);
    // C: default layout after fit: any node covered by the toolbar?
    { const covered = []; for (const id of ["0", "1", "2", "3"]) { const c = await center(id); const hit = await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest("[role=toolbar]")), [c.x, c.y]); if (hit) covered.push(id); }
      const tb = await page.locator("[role=toolbar]").boundingBox();
      console.log(tag, "C toolbar box", JSON.stringify({ w: Math.round(tb.width), h: Math.round(tb.height) }), "nodes covered by toolbar right after load/fit:", JSON.stringify(covered)); }
    // D: rim-grab at max zoom: zoom with the wheel on node 1, grab it at its rim, drag to the left border
    { const c0 = await center("1"); await page.mouse.move(c0.x, c0.y); for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(30); }
      const c = await center("1"); const gx = c.x + c.r * 0.85;
      await page.mouse.move(gx, c.y); await page.mouse.down(); await page.mouse.move(rect.x - 500, c.y, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(100);
      const a = await center("1"); console.log(tag, `D zoom ${await zoomText()} rim-grab drag to left: node centre x=${Math.round(a.x - rect.x)}px relative to svg left, radius=${Math.round(a.r)}px, visible sliver=${Math.round(a.x + a.r - rect.x)}px`);
      await page.screenshot({ path: S(`p2_${tag}_zoom600_rimgrab.png`) });
      // hover: is there a tooltip at 600 %?
      await page.mouse.move(rect.x + 5, a.y); await page.waitForTimeout(100);
      console.log(tag, "D tooltip elements at 600 % while hovering:", await page.locator("svg g[aria-hidden=true] rect").count()); }
    await page.getByRole("button", { name: "Knotenpositionen zurücksetzen" }).click().catch(() => {});
    await page.getByRole("button", { name: "Topologie einpassen" }).click(); await page.waitForTimeout(100);
    // E: right / middle button
    for (const button of ["right", "middle"]) { const c = await center("1"); await page.mouse.move(c.x, c.y); await page.mouse.down({ button }); await page.mouse.move(c.x + 120, c.y + 60, { steps: 4 }); await page.mouse.up({ button }); await page.waitForTimeout(80); const a = await center("1"); console.log(tag, `E ${button}-button drag moved node:`, Math.hypot(a.x - c.x, a.y - c.y) > 2); }
    // F: release outside the window, then move back: node must not follow
    { const c = await center("1"); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(c.x + 50, c.y + 20, { steps: 3 }); await page.mouse.move(-200, -200, { steps: 2 }); await page.mouse.up(); await page.waitForTimeout(80); const a = await center("1"); await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2, { steps: 3 }); await page.waitForTimeout(80); const b = await center("1");
      console.log(tag, "F release outside window: node inside =", inside(a), "| follows mouse afterwards =", Math.hypot(a.x - b.x, a.y - b.y) > 2); }
    // G: wheel during drag and after
    { const c = await center("2"); const z0 = await zoomText(); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(c.x + 40, c.y + 40, { steps: 3 }); await page.mouse.wheel(0, -300); await page.waitForTimeout(80); const z1 = await zoomText(); await page.mouse.move(c.x + 80, c.y + 60, { steps: 3 }); const a = await center("2"); await page.mouse.up();
      await page.mouse.wheel(0, -300); await page.waitForTimeout(100); const z2 = await zoomText(); const b = await center("2");
      console.log(tag, `G wheel during drag: zoom ${z0} -> ${z1}; node under pointer during drag: ${Math.hypot(a.x - (c.x + 80), a.y - (c.y + 60)) < 3}; wheel after drag: ${z2}, node stays under pointer: ${Math.hypot(b.x - (c.x + 80), b.y - (c.y + 60)) < 3}`); }
    // H: fast drag (single step)
    { const c = await center("3"); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(c.x - 150, c.y + 90, { steps: 1 }); await page.mouse.up(); await page.waitForTimeout(80); const a = await center("3"); console.log(tag, "H single-step fast drag lands under pointer:", Math.hypot(a.x - (c.x - 150), a.y - (c.y + 90)) < 3 || !inside({ x: c.x - 150, y: c.y + 90 }, 14)); }
    // I: node overlap: drop node 3 exactly on node 2, then try to click
    { const t = await center("2"); const c = await center("3"); await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(t.x, t.y, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(80);
      await page.screenshot({ path: S(`p2_${tag}_overlap.png`) }); }
    const after = await table();
    console.log(tag, "Z api requests during all drags:", api - apiBefore, "| routing table unchanged:", before === after, "| errors:", JSON.stringify(errors));
    await page.close();
  }
  await browser.close();
})();
