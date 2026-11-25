// Browserprüfung der Graphinteraktion. Nicht Teil von `npm test` oder der CI:
// benötigt eine lokal installierte Playwright-Version mit Chromium sowie die
// laufende Anwendung (Standard: http://127.0.0.1:5173).
//
//   node tests/browser/interaction-checks.cjs [Basis-URL] [Screenshot-Ordner]
//
// Das Skript meldet jedes Ergebnis als "bestanden" oder "NICHT bestanden" und
// endet mit Exit-Code 1, sobald eine Prüfung fehlschlägt.
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..", "..");
const BASE_URL = process.argv[2] || "http://127.0.0.1:5173/";
const SHOT_DIR = process.argv[3] || "";
const SMALL = path.join(ROOT, "tests/fixtures/bonsai_routing_failure.json");
const OTHER = path.join(ROOT, "tests/fixtures/topohub_mini.json");
const LARGE = path.join(ROOT, "tests/fixtures/synthetic_50_nodes.json");
const PANEL_BACKGROUND = [0x13, 0x17, 0x20];

const results = [];
function check(id, description, passed, detail = "") {
  results.push({ id, description, passed: Boolean(passed), detail });
  console.log(`${passed ? "bestanden      " : "NICHT bestanden"} | ${id} | ${description}${detail ? ` | ${detail}` : ""}`);
}
const near = (left, right, tolerance = 1.5) => Math.abs(left - right) <= tolerance;

function luminance([red, green, blue]) {
  const [r, g, b] = [red, green, blue].map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(foreground, background) {
  const [high, low] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", error => consoleErrors.push(`Seitenfehler: ${error.message}`));
  let apiPosts = 0;
  page.on("request", request => { if (request.url().includes("/api/") && request.method() !== "GET") apiPosts += 1; });

  const settle = () => page.waitForTimeout(450);
  const upload = async file => { await page.setInputFiles("input[type=file]", file); await settle(); };
  const shot = async (name, locator) => {
    if (!SHOT_DIR) return;
    await (locator ?? page).screenshot({ path: path.join(SHOT_DIR, name) });
  };
  const nodeCircle = id => page.locator(`[data-graph-node-id="${id}"] circle[r="16"]`);
  const graphPosition = id => nodeCircle(id).evaluate(circle => ({
    x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")),
  }));
  const screenCenter = async id => {
    const box = await nodeCircle(id).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const dragNode = async (id, deltaX, deltaY, { release = true } = {}) => {
    const start = await screenCenter(id);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + deltaX, start.y + deltaY, { steps: 6 });
    if (release) { await page.mouse.up(); await page.waitForTimeout(120); }
    return { x: start.x + deltaX, y: start.y + deltaY };
  };
  const edge = (source, target) => page.locator(`g[role="button"][aria-label="Kante ${source} nach ${target} auswählen"]`);
  const edgeGeometry = (source, target) => edge(source, target).evaluate(group => {
    const line = group.querySelector("line");
    const marker = group.querySelector("circle");
    return {
      x1: Number(line.getAttribute("x1")), y1: Number(line.getAttribute("y1")),
      x2: Number(line.getAttribute("x2")), y2: Number(line.getAttribute("y2")),
      marker: marker ? { x: Number(marker.getAttribute("cx")), y: Number(marker.getAttribute("cy")) } : null,
    };
  });
  const clickEdge = async (source, target) => {
    const box = await edge(source, target).locator("line").first().boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await settle();
  };
  const activeFailures = () => page.locator("text=/Aktive Ausfälle/").first().innerText();
  const resetButton = page.getByRole("button", { name: "Knotenpositionen zurücksetzen" });
  const graph = page.locator('svg[aria-label^="Netzwerkgraph"]');
  const graphSection = page.locator("main > section").first();

  await page.goto(BASE_URL);
  await upload(SMALL);
  await shot("klein_standard.png", graphSection);

  // --- Kontrast der Kanten ohne Route -------------------------------------
  const idle = await edge("B", "T").evaluate(group => {
    const line = group.querySelectorAll("line")[1];
    const style = getComputedStyle(line);
    return { stroke: style.stroke, opacity: Number(style.opacity) };
  });
  const rgb = idle.stroke.match(/\d+/g).slice(0, 3).map(Number);
  const blended = rgb.map((value, index) => value * idle.opacity + PANEL_BACKGROUND[index] * (1 - idle.opacity));
  const idleContrast = contrast(blended, PANEL_BACKGROUND);
  check("K-1", "Kante ohne Route: Kontrast zum Flächenhintergrund mindestens 3:1",
    idleContrast >= 3, `gemessen ${idleContrast.toFixed(2)}:1 (${idle.stroke}, Deckkraft ${idle.opacity})`);

  // --- 1: einzelner Knoten, Linien und Beschriftung folgen -----------------
  const before = { A: await graphPosition("A"), B: await graphPosition("B"), T: await graphPosition("T"), X: await graphPosition("X") };
  await dragNode("B", -120, -90);
  const afterB = await graphPosition("B");
  const others = { A: await graphPosition("A"), T: await graphPosition("T"), X: await graphPosition("X") };
  check("1a", "Ziehen bewegt nur den gezogenen Knoten",
    !near(afterB.x, before.B.x) && ["A", "T", "X"].every(id => near(others[id].x, before[id].x, 0.01) && near(others[id].y, before[id].y, 0.01)));
  const lineBT = await edgeGeometry("B", "T");
  check("1b", "Verbundene Kante endet am verschobenen Knoten",
    (near(lineBT.x1, afterB.x, 0.01) && near(lineBT.y1, afterB.y, 0.01)) || (near(lineBT.x2, afterB.x, 0.01) && near(lineBT.y2, afterB.y, 0.01)));
  await page.getByRole("button", { name: "Namen" }).click();
  const label = await page.locator('[data-graph-node-id="B"] text').last().evaluate(text => ({ x: Number(text.getAttribute("x")), y: Number(text.getAttribute("y")) }));
  check("1c", "Beschriftung folgt dem Knoten", near(label.x, afterB.x, 0.01) && near(label.y, afterB.y + 30, 0.01));
  await page.getByRole("button", { name: "Namen" }).click();

  // --- 2: nach Zoomen und Verschieben bleibt der Knoten unter der Maus ----
  await page.getByRole("button", { name: "Herauszoomen" }).click();
  const graphBox = await graph.boundingBox();
  await page.mouse.move(graphBox.x + 40, graphBox.y + graphBox.height - 40);
  await page.mouse.down();
  await page.mouse.move(graphBox.x + 90, graphBox.y + graphBox.height - 70, { steps: 4 });
  await page.mouse.up();
  const pointer = await dragNode("B", 70, 50, { release: false });
  const held = await screenCenter("B");
  await page.mouse.up();
  await page.waitForTimeout(120);
  check("2", "Knoten bleibt nach Zoom und Verschieben der Ansicht unter der Maus",
    near(held.x, pointer.x, 2) && near(held.y, pointer.y, 2), `Abweichung ${(held.x - pointer.x).toFixed(1)} / ${(held.y - pointer.y).toFixed(1)} px`);
  const movedB = await graphPosition("B");

  // --- 3 und 5: Ausfall und Wiederherstellung -----------------------------
  await clickEdge("B", "T");
  const failedText = await activeFailures();
  const failedGeometry = await edgeGeometry("B", "T");
  const afterFailure = await graphPosition("B");
  check("3a", "Kantenausfall erhält die manuelle Position", near(afterFailure.x, movedB.x, 0.01) && near(afterFailure.y, movedB.y, 0.01));
  check("3b", "Kantenausfall wird fachlich ausgewiesen", /\(1\)/.test(failedText), failedText.replace(/\s+/g, " "));
  check("5", "Kreuzmarkierung liegt auf der Mitte der ausgefallenen Kante",
    failedGeometry.marker && near(failedGeometry.marker.x, (failedGeometry.x1 + failedGeometry.x2) / 2, 0.01)
      && near(failedGeometry.marker.y, (failedGeometry.y1 + failedGeometry.y2) / 2, 0.01));
  await shot("klein_ausfall_verschoben.png", graphSection);

  // --- 6: Einpassen behält die Anordnung ----------------------------------
  await page.getByRole("button", { name: "Topologie einpassen" }).click();
  const afterFit = await graphPosition("B");
  check("6", "„Einpassen“ behält die manuelle Anordnung", near(afterFit.x, movedB.x, 0.01) && near(afterFit.y, movedB.y, 0.01));

  // --- 4: Einstellungen wechseln -------------------------------------------
  const selects = page.locator("aside select");
  await selects.nth(0).selectOption("T"); await settle();
  await page.getByRole("button", { name: /Bonsai \(Greedy\)/ }).click(); await settle();
  await page.getByRole("button", { name: /Kürzester Pfad/ }).click(); await settle();
  await selects.nth(1).selectOption("edge_weight"); await settle();
  await selects.nth(2).selectOption("__hide_routes__"); await settle();
  await selects.nth(2).selectOption(""); await settle();
  const afterSettings = await graphPosition("B");
  check("4", "Ziel, Verfahren, Metrik und Routenhervorhebung erhalten die Anordnung",
    near(afterSettings.x, movedB.x, 0.01) && near(afterSettings.y, movedB.y, 0.01));

  // --- 7: Zurücksetzen -----------------------------------------------------
  await resetButton.click();
  const afterReset = await graphPosition("B");
  check("7a", "Zurücksetzen stellt die ursprüngliche Position wieder her", near(afterReset.x, before.B.x, 0.01) && near(afterReset.y, before.B.y, 0.01));
  check("7b", "Zurücksetzen erhält die Ausfälle", /\(1\)/.test(await activeFailures()));
  await clickEdge("B", "T");
  check("3c", "Erneuter Klick stellt die Kante wieder her", /\(0\)/.test(await activeFailures()));

  // --- 9: Drag außerhalb der Graphfläche beenden --------------------------
  const failuresBefore = await activeFailures();
  const start = await screenCenter("X");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(100, 400, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const released = await graphPosition("X");
  await page.mouse.move(700, 600, { steps: 4 });
  await page.waitForTimeout(150);
  const afterMove = await graphPosition("X");
  check("9a", "Nach dem Loslassen außerhalb hängt kein Knoten an der Maus", near(afterMove.x, released.x, 0.01) && near(afterMove.y, released.y, 0.01));
  check("9b", "Drag außerhalb löst keinen Kantenausfall aus", (await activeFailures()) === failuresBefore);

  // --- 8: Topologiewechsel -------------------------------------------------
  await dragNode("B", 40, -40);
  await upload(OTHER);
  check("8a", "Andere Topologie: keine manuelle Anordnung übernommen", await resetButton.isDisabled());
  await upload(SMALL);
  const reimported = await graphPosition("B");
  check("8b", "Erneuter Import nach Topologiewechsel: ursprüngliche Positionen",
    near(reimported.x, before.B.x, 0.01) && near(reimported.y, before.B.y, 0.01) && await resetButton.isDisabled());
  await dragNode("B", -60, -60);
  const postsBefore = apiPosts;
  await upload(SMALL);
  check("8c", "Dieselbe Datei direkt erneut importieren löst einen Import aus",
    apiPosts > postsBefore && await resetButton.isDisabled(), `${apiPosts - postsBefore} Anfrage(n)`);

  // --- Mausrad --------------------------------------------------------------
  const errorsBeforeWheel = consoleErrors.length;
  const box = await graph.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(250);
  const scrollY = await page.evaluate(() => window.scrollY);
  const zoomText = await page.locator("output").innerText();
  check("M-1", "Mausrad über dem Graphen zoomt, ohne die Seite zu scrollen", scrollY === 0 && !/10[0-9] %/.test(zoomText), `scrollY ${scrollY}, Zoom ${zoomText}`);
  check("M-2", "Mausrad erzeugt keinen Konsolenfehler", consoleErrors.length === errorsBeforeWheel, consoleErrors[errorsBeforeWheel] ?? "");
  await page.evaluate(() => window.scrollTo(0, 0));

  // --- Interpretationstext --------------------------------------------------
  await page.getByRole("button", { name: /Aufklappen/ }).click();
  const interpretation = await page.locator("text=/aktive.? Kantenausf/").last().innerText();
  check("T-1", "Interpretationstext ohne „. ;“ und mit korrektem Plural",
    !interpretation.includes(". ;") && !interpretation.includes("Kantenausfalle"), interpretation);
  await shot("klein_interpretation.png", page.locator("#routing-detail-panels > section").last());
  await page.getByRole("button", { name: /Einklappen/ }).click();

  // --- 10: große Topologie und kleine Fensterbreite ------------------------
  await upload(LARGE);
  await shot("gross_alle_routen.png", graphSection);
  await selects.nth(2).selectOption("__hide_routes__"); await settle();
  await shot("gross_keine_route.png", graphSection);
  await selects.nth(2).selectOption(""); await settle();
  await page.setViewportSize({ width: 900, height: 700 });
  await page.waitForTimeout(300);
  const toolbar = await page.getByRole("toolbar").boundingBox();
  const area = await graph.boundingBox();
  check("10a", "Werkzeugleiste bleibt bei 900 px Fensterbreite innerhalb der Graphfläche",
    toolbar.x >= area.x && toolbar.x + toolbar.width <= area.x + area.width + 1, `Leiste ${Math.round(toolbar.width)} px, Fläche ${Math.round(area.width)} px`);
  check("10b", "Keine Konsolenfehler während des gesamten Ablaufs", consoleErrors.length === 0,
    consoleErrors.length ? `${consoleErrors.length}: ${consoleErrors[0]}` : "");

  await browser.close();
  const failed = results.filter(result => !result.passed);
  console.log(`\n${results.length - failed.length} von ${results.length} Prüfungen bestanden.`);
  process.exit(failed.length ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(2);
});
