// Paket 1: Lesbarkeit der Kanten ohne Route.
const path = require("node:path");

const rgb = text => text.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);

module.exports = {
  name: "Paket 1: Kantenlesbarkeit",
  async run(context) {
    const {
      page, check, upload, shot, graphSection, edgeStroke, clickEdge, choose, strategy,
      contrast, FIXTURES, PANEL_BACKGROUND, ROOT,
    } = context;
    const dense = path.join(ROOT, "tests/fixtures/synthetic_50_nodes_dense.json");
    const effective = stroke => contrast(
      rgb(stroke.stroke).map((value, index) => value * stroke.opacity + PANEL_BACKGROUND[index] * (1 - stroke.opacity)),
      PANEL_BACKGROUND,
    );

    // Kleine Topologie: Ziel A, Kante B–T liegt auf keiner Route.
    await upload(FIXTURES.small);
    await shot("klein_normal.png", graphSection);
    const idle = await edgeStroke("B", "T");
    const idleContrast = effective(idle);
    check("K-1", "Kante ohne Route: Kontrast zum Flächenhintergrund mindestens 3:1",
      idleContrast >= 3, `gemessen ${idleContrast.toFixed(2)}:1 (${idle.stroke}, Deckkraft ${idle.opacity})`);

    const current = await edgeStroke("X", "T");
    check("K-2", "Aktuelle Route bleibt grün und kontraststärker als Grau",
      current.stroke === "rgb(57, 255, 20)" && effective(current) > idleContrast, `${effective(current).toFixed(2)}:1`);

    await clickEdge("A", "T");
    await shot("klein_ausfall.png", graphSection);
    const failed = await edgeStroke("A", "T");
    check("K-3", "Ausgefallene Kante bleibt rot gestrichelt und kontraststärker als Grau",
      failed.stroke === "rgb(255, 64, 64)" && failed.dash !== "none" && effective(failed) > idleContrast,
      `${effective(failed).toFixed(2)}:1, Strichmuster ${failed.dash}`);
    const idleDash = (await edgeStroke("B", "T").catch(() => idle)).dash;
    check("K-4", "Kante ohne Route ist durchgezogen und damit von der Ausfalllinie unterscheidbar", idle.dash === "none", `Strichmuster ${idleDash}`);
    await clickEdge("A", "T");

    const legend = await page.locator("text=Legende").locator("..").innerText();
    check("K-5", "Legende erklärt die graue Kante", /Kante ohne Route/.test(legend), legend.replace(/\s+/g, " "));

    await choose("Zielknoten", "T");
    await strategy(/Bonsai \(Greedy\)/);
    await shot("klein_bonsai.png", graphSection);
    const arrows = await page.locator('line[marker-end="url(#tree-arrow)"]').count();
    check("K-6", "Aboreszenzpfeile bleiben im Bonsai-Modus sichtbar", arrows > 0, `${arrows} Pfeile`);

    // Größere Topologien.
    await upload(FIXTURES.large);
    await shot("gross_alle_routen.png", graphSection);
    await choose("Route hervorheben", "__hide_routes__");
    await shot("gross_keine_route.png", graphSection);
    await choose("Route hervorheben", "");

    await upload(dense);
    await shot("dicht_alle_routen.png", graphSection);
    const groups = page.locator('g[role="button"][aria-label^="Kante "]');
    const strokes = await groups.evaluateAll(items => items.map(group => {
      const lines = [...group.querySelectorAll("line")]
        .filter(item => item.getAttribute("stroke") !== "transparent" && !item.getAttribute("marker-end"))
        .filter(item => getComputedStyle(item).stroke !== "rgb(56, 189, 248)");
      const underlay = lines.length > 1 && getComputedStyle(lines[0]).stroke === "rgb(192, 132, 252)";
      const style = getComputedStyle(underlay ? lines[1] : lines[0]);
      return { stroke: style.stroke, opacity: Number(style.opacity) };
    }));
    const idleLines = strokes.filter(item => !["rgb(57, 255, 20)", "rgb(192, 132, 252)", "rgb(255, 64, 64)"].includes(item.stroke));
    check("K-7", "Dichte Topologie: alle Kanten ohne Route erreichen 3:1",
      idleLines.length > 0 && idleLines.every(item => effective(item) >= 3),
      `${idleLines.length} Kanten ohne Route von ${strokes.length}, geringster Kontrast ${Math.min(...idleLines.map(effective)).toFixed(2)}:1`);
    for (const index of [3, 20]) {
      const box = await groups.nth(index).locator("line").first().boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await context.settle();
    }
    await shot("dicht_ausfaelle.png", graphSection);
  },
};
