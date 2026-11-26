// Browserprüfungen der Oberfläche. Nicht Teil von `npm test` oder der CI:
// benötigt eine lokal installierte Playwright-Version mit Chromium sowie die
// laufende Anwendung (Standard: http://127.0.0.1:5173/).
//
//   node tests/browser/run-checks.cjs [Basis-URL] [Screenshot-Ordner]
//
// Jede Datei unter tests/browser/checks/ ist eine eigenständige Prüfgruppe und
// startet mit einer frisch geladenen Seite. Das Skript endet mit Exit-Code 1,
// sobald eine Prüfung fehlschlägt.
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { createContext } = require("./lib.cjs");

const BASE_URL = process.argv[2] || "http://127.0.0.1:5173/";
const SHOT_DIR = process.argv[3] || "";
const ONLY = process.env.CHECKS ? process.env.CHECKS.split(",") : null;

(async () => {
  const checkDirectory = path.join(__dirname, "checks");
  const files = fs.readdirSync(checkDirectory)
    .filter(file => file.endsWith(".cjs"))
    .filter(file => !ONLY || ONLY.some(prefix => file.startsWith(prefix)))
    .sort();
  const results = [];
  const browser = await chromium.launch();
  for (const file of files) {
    const group = require(path.join(checkDirectory, file));
    console.log(`\n== ${group.name} (${file})`);
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const context = createContext({ page, baseUrl: BASE_URL, shotDir: SHOT_DIR, results });
    try {
      await page.goto(BASE_URL);
      await group.run(context);
    } catch (error) {
      context.check(`${file}`, "Prüfgruppe läuft ohne Abbruch durch", false, String(error.message).split("\n")[0]);
    }
    await page.close();
  }
  await browser.close();
  const failed = results.filter(result => !result.passed);
  console.log(`\n${results.length - failed.length} von ${results.length} Prüfungen bestanden.`);
  process.exit(failed.length ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(2);
});
