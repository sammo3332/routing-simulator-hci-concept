// Vergleicht die DOM-Ausgabe der Ansicht vor und nach der Änderung für den Bildexport.
// Grundlage ist die Aussage, die Oberfläche habe sich bis auf zwei neue Schaltflächen
// und einige Hilfsattribute nicht verändert. Das Skript lädt in zwei laufenden
// Anwendungen dieselben Zustände und vergleicht Graph, Legende, Werkzeugleiste,
// Seitenleiste und den sichtbaren Text Byte für Byte.
//
//   node tests/browser/dom-identity.cjs <Adresse vor der Änderung> <Adresse danach>
//
// Ausgenommen sind: die Hilfsattribute data-export*, data-graph-scene, die
// Schaltflächengruppe „Graph als Bild herunterladen“ und deren Beschriftungen.
// Die Anwendung „vorher“ lässt sich aus dem Stand vor dem Commit des Bildexports
// bauen (zum Beispiel in einem eigenen Arbeitsverzeichnis mit `git worktree`).
const path = require("node:path");
const { chromium } = require("playwright");
const crypto = require("node:crypto");
const FIX = `${path.resolve(__dirname, "..", "fixtures")}/`;
const [oldBase, newBase] = process.argv.slice(2);

async function collect(base) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await page.goto(base);
  const settle = async () => { await page.waitForTimeout(150); await page.getByText("Bereit", { exact: true }).waitFor(); await page.waitForTimeout(100); };
  const upload = async f => { await page.locator('input[type="file"][accept*=".graphml"]').setInputFiles(FIX + f); await settle(); };
  const states = {};
  const take = async name => {
    states[name] = await page.evaluate(() => {
      const strip = html => html
        .replace(/ data-export="(skip|label-optional)"/g, "")
        .replace(/ data-export-stroke-width="[^"]*"/g, "")
        .replace(/ data-graph-scene="true"/g, "");
      const section = document.querySelectorAll("main > section")[0];
      const toolbar = document.querySelector('[role="toolbar"]');
      return {
        graph: strip(document.querySelector('svg[aria-label^="Netzwerkgraph"]').innerHTML),
        legend: section.lastElementChild.outerHTML,
        toolbar: toolbar.outerHTML.replace(/<div role="group" aria-label="Graph als Bild herunterladen".*?<\/div>/, ""),
        aside: document.querySelector("aside").innerText,
        details: document.querySelector("main").innerText.replace(/\[\d\d:\d\d:\d\d\]/g, "[t]").replace("\nSVG\nPNG", ""),
      };
    });
  };
  await upload("bonsai_routing_failure.json"); await take("1 klein, Kürzester Pfad");
  await page.getByRole("button", { name: /Bonsai \(Greedy\)/ }).click(); await settle();
  const box = await page.locator('g[role="button"][aria-label="Kante A nach T auswählen"] line').first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await settle();
  await take("2 Bonsai mit Ausfall");
  await page.locator("aside select").nth(2).selectOption("B"); await settle(); await take("3 Route von B hervorgehoben");
  await page.locator("aside select").nth(2).selectOption("__hide_routes__"); await settle(); await take("4 keine Route hervorgehoben");
  await page.locator("aside select").nth(2).selectOption(""); await settle();
  await page.getByRole("button", { name: "Namen", exact: true }).click(); await take("5 alle Namen");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Hineinzoomen" }).click();
  await page.waitForTimeout(100); await take("6 gezoomt");
  await upload("synthetic_50_nodes.json");
  await page.locator("aside select").nth(0).selectOption("7"); await settle();
  await page.locator("aside select").nth(1).selectOption("edge_weight"); await settle();
  const edgeSelect = page.locator("aside select").filter({ has: page.locator("option", { hasText: "↔" }) }).first();
  for (const index of [5, 30]) { await edgeSelect.selectOption({ index }); await page.getByRole("button", { name: /Ausgewählte Kante ausfallen lassen/ }).click(); await settle(); }
  await take("7 groß, zwei Ausfälle");
  await upload("synthetic_50_nodes_dense.json"); await take("8 dicht");
  await browser.close();
  return states;
}
(async () => {
  const [before, after] = [await collect(oldBase), await collect(newBase)];
  let identical = 0;
  for (const name of Object.keys(before)) {
    const parts = ["graph", "legend", "toolbar", "aside", "details"].map(key => [key, before[name][key] === after[name][key]]);
    const ok = parts.every(([, same]) => same);
    if (ok) identical += 1;
    const hash = value => crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);
    console.log(`${ok ? "identisch  " : "ABWEICHUNG "} | ${name} | ${parts.map(([key, same]) => `${key}:${same ? "=" : "≠"}`).join(" ")} | graph ${hash(after[name].graph)} (${after[name].graph.length} Zeichen)`);
    if (!ok) for (const [key, same] of parts) if (!same) {
      const a = before[name][key], b = after[name][key]; let i = 0; while (a[i] === b[i]) i++;
      console.log(`   erste Abweichung in ${key} bei Zeichen ${i}:\n   alt : ${a.slice(Math.max(0, i - 60), i + 90)}\n   neu : ${b.slice(Math.max(0, i - 60), i + 90)}`);
    }
  }
  console.log(`${identical} von ${Object.keys(before).length} Zuständen mit identischer DOM-Ausgabe (ohne die neuen Hilfsattribute und ohne die neue Schaltflächengruppe)`);
})();
