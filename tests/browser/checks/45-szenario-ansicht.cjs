// Paket 3 (optionaler Commit): Ansichtszustand im Szenario.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

module.exports = {
  name: "Paket 3: Ansichtszustand im Szenario",
  async run(context) {
    const { page, check, settle, upload, shot, graphSection, graphPosition, dragNode, clickEdge, routeTable, near, FIXTURES } = context;
    const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "szenario-ansicht-"));
    const scenarioInput = page.locator('input[type="file"][aria-label="Szenariodatei auswählen"]');
    const namesButton = page.getByRole("button", { name: "Namen" });
    const resetButton = page.getByRole("button", { name: "Knotenpositionen zurücksetzen" });
    const same = (left, right) => near(left.x, right.x, 0.01) && near(left.y, right.y, 0.01);

    await upload(FIXTURES.small);
    const original = { B: await graphPosition("B"), X: await graphPosition("X") };
    await clickEdge("A", "T");
    const tableBefore = await routeTable();
    await page.getByRole("button", { name: /Einklappen/ }).click();
    await dragNode("B", -150, -80);
    await namesButton.click();
    const moved = await graphPosition("B");
    await shot("vor_dem_speichern.png", graphSection);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Szenario speichern" }).click(),
    ]);
    const file = path.join(workDirectory, "ansicht.json");
    await download.saveAs(file);
    await settle();
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    const stored = data.visualization?.node_display_positions ?? {};
    check("A-1", "Datei speichert nur den verschobenen Knoten als Ansichtsposition",
      Object.keys(stored).join(",") === "B" && same(stored.B, moved), JSON.stringify(stored));
    const nodeB = data.topology.nodes.find(node => node.id === "B");
    check("A-2", "Importierte Koordinaten der Topologie bleiben unverändert",
      nodeB.position.x === 1 && nodeB.position.y === 0, JSON.stringify(nodeB.position));
    check("A-3", "Namensanzeige ist als Ansichtsoption gespeichert", data.visualization.show_labels === true);

    await page.reload();
    await page.waitForTimeout(300);
    await scenarioInput.setInputFiles(file);
    await settle();
    check("A-4", "Nach dem Laden liegt der Knoten an der gespeicherten Stelle", same(await graphPosition("B"), moved));
    check("A-5", "Nicht verschobene Knoten liegen an ihrer berechneten Stelle", same(await graphPosition("X"), original.X));
    check("A-6", "Namensanzeige ist wieder eingeschaltet", (await namesButton.getAttribute("aria-pressed")) === "true");
    check("A-7", "Fachlicher Zustand stimmt überein", (await routeTable()) === tableBefore);
    await page.getByRole("button", { name: /Einklappen/ }).click();
    await shot("nach_dem_laden.png", graphSection);
    check("A-8", "„Knotenpositionen zurücksetzen“ ist aktiv und stellt die ursprüngliche Anordnung her",
      await resetButton.isEnabled() && (await resetButton.click(), same(await graphPosition("B"), original.B)));

    // Szenario ohne Ansichtszustand: Standardansicht.
    delete data.visualization;
    const plain = path.join(workDirectory, "ohne-ansicht.json");
    fs.writeFileSync(plain, JSON.stringify(data));
    await namesButton.click();
    await namesButton.click();
    await dragNode("X", 60, 40);
    await scenarioInput.setInputFiles(plain);
    await settle();
    check("A-9", "Szenario ohne Ansichtszustand: ursprüngliche Anordnung, Namensanzeige aus",
      same(await graphPosition("X"), original.X) && same(await graphPosition("B"), original.B)
        && (await namesButton.getAttribute("aria-pressed")) === "false" && await resetButton.isDisabled());
    fs.rmSync(workDirectory, { recursive: true, force: true });
  },
};
