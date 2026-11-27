const { chromium } = require("playwright");
const path = require("node:path"); const fs = require("node:fs");
const BASE = process.env.BASE || "http://127.0.0.1:5173";
const FX = path.join(__dirname, "..", "fixtures") + path.sep;
const F = n => path.join(__dirname, "files", n);
const state = async page => ({
  header: (await page.locator("header").innerText()).replace(/\s+/g, " "),
  scenarioStatus: (await page.locator("aside [role=status]").allInnerTexts()).join("|"),
  alerts: (await page.locator("aside [role=alert]").allInnerTexts()).join("|"),
  target: await page.locator("aside select").nth(0).inputValue(),
  topoBox: (await page.locator("aside").locator("div", { hasText: /Klicken zum Ersetzen|Drag & Drop/ }).last().innerText()).replace(/\s+/g, " "),
});
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  const reqs = []; page.on("request", r => { if (r.url().includes("/api/")) reqs.push(r.method() + " " + new URL(r.url()).pathname.replace(/[0-9a-f-]{36}/, "<sid>")); });
  await page.goto(BASE);
  const topo = page.locator('input[type="file"][accept*=".graphml"]');
  const scen = page.locator('input[aria-label="Szenariodatei auswählen"]');
  const ready = async () => { await page.waitForTimeout(150); await page.getByText("Bereit", { exact: true }).waitFor(); await page.waitForTimeout(100); };

  // --- keyboard ---
  await page.keyboard.press("Tab");
  let reached = [];
  for (let i = 0; i < 6; i++) { reached.push(await page.evaluate(() => document.activeElement?.innerText?.slice(0, 30) || document.activeElement?.tagName)); await page.keyboard.press("Tab"); }
  console.log("K1 tab order (first 6 focus stops, empty page):", JSON.stringify(reached));
  for (const key of ["Enter", "Space"]) {
    await page.getByRole("button", { name: "Szenario laden" }).focus();
    const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 3000 }).catch(() => null), page.keyboard.press(key)]);
    console.log("K2", key, "on 'Szenario laden' opens file chooser:", Boolean(chooser));
  }
  { const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 3000 }).catch(() => null), page.getByRole("button", { name: "Szenario laden" }).click()]);
    console.log("K2 mouse click opens file chooser:", Boolean(chooser)); }
  const outline = await page.getByRole("button", { name: "Szenario laden" }).evaluate(el => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth);
  console.log("K3 focus outline on button:", outline);

  // --- race 1: change Zielknoten while a scenario is loading ---
  await topo.setInputFiles(FX + "topohub_mini.json"); await ready();
  await page.route("**/api/sessions/**", async route => {
    const u = route.request().url(), m = route.request().method();
    if (u.endsWith("import-scenario")) await new Promise(r => setTimeout(r, 1200));
    else if (m === "PATCH") await new Promise(r => setTimeout(r, 2500));
    await route.continue();
  });
  await scen.setInputFiles(F("ui_ok.json"));
  await page.waitForTimeout(200);
  const sel = page.locator("aside select").nth(0);
  console.log("R1 during scenario load: Zielknoten select disabled =", await sel.isDisabled(), "| Routingmetrik disabled =", await page.locator("aside select").nth(1).isDisabled(), "| Szenario laden disabled =", await page.getByRole("button", { name: "Szenario laden" }).isDisabled(), "| Szenario speichern disabled =", await page.getByRole("button", { name: "Szenario speichern" }).isDisabled());
  // Vor der Korrektur ließ sich das Ziel hier ändern (PATCH auf die ALTE Sitzung,
  // Antwort nach dem Szenario). Seit der Korrektur ist das Feld während des
  // Ladens gesperrt; der Versuch wird deshalb nach kurzer Wartezeit abgebrochen.
  const changed = await sel.selectOption("2", { timeout: 800 }).then(() => true).catch(() => false);
  console.log("R1 Zielknoten während des Ladens änderbar:", changed);
  await page.waitForTimeout(1500);
  console.log("R1 after scenario answered:", JSON.stringify(await state(page)));
  await page.waitForTimeout(2500); await ready();
  console.log("R1 after late PATCH answered:", JSON.stringify(await state(page)));
  await page.unroute("**/api/sessions/**");

  // what does 'Szenario speichern' now save?
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Szenario speichern" }).click()]);
  const saved = JSON.parse(fs.readFileSync(await dl.path(), "utf-8"));
  console.log("R1 saved file after race: topology_id =", saved.topology.topology_id, "target =", saved.routing.target_node_id, "file =", dl.suggestedFilename());

  // --- sequence scenario -> topology -> scenario, failed load in between ---
  await page.reload();
  await scen.setInputFiles(F("ui_ok.json")); await ready(); console.log("Q1 scenario:", JSON.stringify(await state(page)));
  await topo.setInputFiles(FX + "graphml_mini.graphml"); await ready(); console.log("Q2 topology:", JSON.stringify(await state(page)));
  await scen.setInputFiles(FX + "topohub_mini.json"); await ready(); console.log("Q3 topology file via scenario button:", JSON.stringify(await state(page)));
  await topo.setInputFiles(F("ui_ok.json")); await ready(); console.log("Q4 scenario file via topology box:", JSON.stringify(await state(page)));
  await scen.setInputFiles(F("ui_snapshot_garbage.json")); await ready(); console.log("Q5 scenario:", JSON.stringify(await state(page)));
  await topo.setInputFiles(F("ui_id_surrogate.json")); await ready(); console.log("Q6 bad topology after scenario:", JSON.stringify(await state(page)));
  // event log
  await page.getByRole("button", { name: /Aufklappen/ }).click().catch(() => {});
  await page.getByRole("button", { name: /Ereignisprotokoll anzeigen/ }).click();
  console.log("LOG:\n" + await page.locator("#event-log-panel").innerText());

  // --- double click on save ---
  let downloads = 0; page.on("download", () => downloads++);
  await page.getByRole("button", { name: "Szenario speichern" }).dblclick();
  await page.waitForTimeout(1200);
  console.log("D1 downloads after double click on save:", downloads);

  // --- drop on topology box while loading (disabled only guards click) ---
  console.log("errors:", JSON.stringify(errors));
  console.log("requests:", reqs.join(", "));
  await browser.close();
})();
