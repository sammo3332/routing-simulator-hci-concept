// Gemeinsame Fehlerbehebungen: erneuter Import, Mausrad, Interpretationstext.
module.exports = {
  name: "Basis: Fehlerbehebungen",
  async run({ page, check, upload, graph, openDetails, consoleErrors, apiRequests, FIXTURES }) {
    await upload(FIXTURES.small);
    const requestsBefore = apiRequests.length;
    await upload(FIXTURES.small);
    check("B-1", "Dieselbe Datei direkt erneut importieren löst einen Import aus",
      apiRequests.length > requestsBefore, `${apiRequests.length - requestsBefore} Anfrage(n)`);

    const errorsBeforeWheel = consoleErrors.length;
    const box = await graph.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const zoomBefore = await page.locator("output").innerText();
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(250);
    const scrollY = await page.evaluate(() => window.scrollY);
    const zoomAfter = await page.locator("output").innerText();
    check("B-2", "Mausrad über dem Graphen zoomt, ohne die Seite zu scrollen",
      scrollY === 0 && zoomAfter !== zoomBefore, `scrollY ${scrollY}, Zoom ${zoomBefore} → ${zoomAfter}`);
    check("B-3", "Mausrad erzeugt keinen Konsolenfehler",
      consoleErrors.length === errorsBeforeWheel, consoleErrors[errorsBeforeWheel] ?? "");
    await page.evaluate(() => window.scrollTo(0, 0));

    await openDetails();
    const interpretation = await page.locator("text=/aktive.? Kantenausf/").last().innerText();
    check("B-4", "Interpretationstext ohne „. ;“ und mit korrektem Plural",
      !interpretation.includes(". ;") && !interpretation.includes("Kantenausfalle"), interpretation);
    check("B-5", "Keine Konsolenfehler in dieser Prüfgruppe", consoleErrors.length === 0, consoleErrors[0] ?? "");
  },
};
