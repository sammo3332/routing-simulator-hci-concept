// Package 3 UI: which backend-accepted scenario files break the frontend?
const { chromium } = require("playwright");
const path = require("node:path"); const fs = require("node:fs");
const BASE = process.env.BASE || "http://127.0.0.1:5173";
const FX = path.join(__dirname, "..", "fixtures") + path.sep;
const SHOTS = process.env.SHOTS || path.join(require("node:os").tmpdir(), "review-shots");
fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const names = fs.readdirSync(path.join(__dirname, "files")).filter(f => f.startsWith("ui_"));
  for (const name of names) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
    page.on("pageerror", e => errors.push("PAGEERROR " + e.message.slice(0, 160)));
    await page.goto(BASE);
    // known-good state first
    await page.locator('input[type="file"][accept*=".graphml"]').setInputFiles(FX + "topohub_mini.json");
    await page.getByText("Bereit", { exact: true }).waitFor();
    await page.waitForTimeout(200);
    const before = await page.locator("header").innerText();
    await page.locator('input[aria-label="Szenariodatei auswählen"]').setInputFiles(path.join(__dirname, "files", name));
    await page.waitForTimeout(700);
    const rootEmpty = await page.evaluate(() => document.getElementById("root").children.length === 0);
    const header = rootEmpty ? "" : (await page.locator("header").innerText()).replace(/\s+/g, " ");
    const alert = rootEmpty ? "" : (await page.locator("aside [role=alert]").allInnerTexts()).join(" | ").slice(0, 140);
    const loaded = rootEmpty ? "" : (await page.locator("aside [role=status]").allInnerTexts()).join(" | ").slice(0, 80);
    const nan = rootEmpty ? 0 : await page.evaluate(() => [...document.querySelectorAll("svg[aria-label^=Netzwerkgraph] *")].filter(el => [...el.attributes].some(a => /NaN|Infinity|undefined/.test(a.value))).length);
    const topoName = rootEmpty ? "" : await page.locator("aside").locator("text=/topohub_mini.json/").count();
    await page.screenshot({ path: path.join(SHOTS, "p3_" + name.replace(".json", ".png")) });
    console.log(`${name.padEnd(40)} whiteScreen=${rootEmpty} NaNattrs=${nan} stateChanged=${header !== before.replace(/\s+/g, " ")} topoFileShown=${topoName} status="${loaded}" alert="${alert}" errors=${JSON.stringify(errors.slice(0, 2))}`);
    await page.close();
  }
  await browser.close();
})();
