// Paket 2: einzelne Knoten verschieben.
module.exports = {
  name: "Paket 2: Knotenverschieben",
  async run(context) {
    const {
      page, check, settle, upload, shot, graph, graphSection, graphPosition, screenCenter,
      dragNode, edge, edgeGeometry, clickEdge, activeFailures, choose, strategy, routeTable,
      consoleErrors, apiRequests, near, FIXTURES,
    } = context;
    const resetButton = page.getByRole("button", { name: "Knotenpositionen zurücksetzen" });
    const same = (left, right, tolerance = 0.01) => near(left.x, right.x, tolerance) && near(left.y, right.y, tolerance);
    const headerMetrics = () => page.locator("header").innerText();

    await upload(FIXTURES.small);
    const before = { A: await graphPosition("A"), B: await graphPosition("B"), T: await graphPosition("T"), X: await graphPosition("X") };
    const tableBefore = await routeTable();
    const metricsBefore = await headerMetrics();
    await page.getByRole("button", { name: /Einklappen/ }).click();

    // --- 1: einzelner Knoten, Linien und Beschriftung folgen ---------------
    const requestsBeforeDrag = apiRequests.length;
    await dragNode("B", -120, -90);
    const afterB = await graphPosition("B");
    const others = { A: await graphPosition("A"), T: await graphPosition("T"), X: await graphPosition("X") };
    check("N-1a", "Ziehen bewegt nur den gezogenen Knoten",
      !same(afterB, before.B, 1) && ["A", "T", "X"].every(id => same(others[id], before[id])));
    const lineBT = await edgeGeometry("B", "T");
    check("N-1b", "Verbundene Kante endet am verschobenen Knoten",
      same({ x: lineBT.x1, y: lineBT.y1 }, afterB) || same({ x: lineBT.x2, y: lineBT.y2 }, afterB));
    await page.getByRole("button", { name: "Namen" }).click();
    const label = await page.locator('[data-graph-node-id="B"] text').last().evaluate(text => ({ x: Number(text.getAttribute("x")), y: Number(text.getAttribute("y")) }));
    check("N-1c", "Beschriftung folgt dem Knoten", same(label, { x: afterB.x, y: afterB.y + 30 }));
    await page.getByRole("button", { name: "Namen" }).click();
    check("N-1d", "Verschieben löst keine API-Anfrage aus", apiRequests.length === requestsBeforeDrag,
      `${apiRequests.length - requestsBeforeDrag} Anfrage(n)`);
    const tableAfterDrag = await routeTable();
    check("N-1e", "Routingzusammenfassung und Kennzahlen sind nach dem Verschieben unverändert",
      tableAfterDrag === tableBefore && (await headerMetrics()) === metricsBefore);
    await page.getByRole("button", { name: /Einklappen/ }).click();

    // --- 2: nach Zoomen und Verschieben der Ansicht -------------------------
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
    check("N-2a", "Knoten bleibt nach Zoom und Verschieben der Ansicht unter der Maus",
      near(held.x, pointer.x, 2) && near(held.y, pointer.y, 2), `Abweichung ${(held.x - pointer.x).toFixed(1)} / ${(held.y - pointer.y).toFixed(1)} px`);
    await page.getByRole("button", { name: "Hineinzoomen" }).click();
    await page.getByRole("button", { name: "Hineinzoomen" }).click();
    const zoomedPointer = await dragNode("T", -30, 25, { release: false });
    const zoomedHeld = await screenCenter("T");
    await page.mouse.up();
    await page.waitForTimeout(120);
    check("N-2b", "Knoten bleibt auch hineingezoomt unter der Maus",
      near(zoomedHeld.x, zoomedPointer.x, 2) && near(zoomedHeld.y, zoomedPointer.y, 2));
    await page.getByRole("button", { name: "Topologie einpassen" }).click();
    const movedB = await graphPosition("B");
    const movedT = await graphPosition("T");

    // --- 3 und 5: Ausfall und Wiederherstellung ----------------------------
    await clickEdge("B", "T");
    const failedGeometry = await edgeGeometry("B", "T");
    check("N-3a", "Kantenausfall erhält die manuelle Position", same(await graphPosition("B"), movedB));
    check("N-3b", "Kantenausfall wird fachlich ausgewiesen", /\(1\)/.test(await activeFailures()));
    check("N-5", "Kreuzmarkierung liegt auf der Mitte der ausgefallenen Kante zwischen den verschobenen Knoten",
      failedGeometry.marker && same(failedGeometry.marker, {
        x: (movedB.x + movedT.x) / 2, y: (movedB.y + movedT.y) / 2,
      }));
    await shot("ausfall_verschoben.png", graphSection);

    // --- 6: Einpassen behält die Anordnung ---------------------------------
    await page.getByRole("button", { name: "Topologie einpassen" }).click();
    check("N-6", "„Einpassen“ behält die manuelle Anordnung", same(await graphPosition("B"), movedB));

    // --- 4: Einstellungen wechseln ------------------------------------------
    await choose("Zielknoten", "T");
    await choose("Routingmetrik", "edge_weight");
    await choose("Route hervorheben", "__hide_routes__");
    await choose("Route hervorheben", "A");
    await choose("Route hervorheben", "");
    await strategy(/Bonsai \(Greedy\)/);
    check("N-4a", "Ziel, Metrik, Routenhervorhebung und Verfahren erhalten die Anordnung",
      same(await graphPosition("B"), movedB) && same(await graphPosition("T"), movedT));

    // --- Aboreszenzpfeile ----------------------------------------------------
    await clickEdge("B", "T");
    const arrow = () => edge("B", "T").locator('line[marker-end="url(#tree-arrow)"]').evaluate(line => ({
      x1: Number(line.getAttribute("x1")), y1: Number(line.getAttribute("y1")),
      x2: Number(line.getAttribute("x2")), y2: Number(line.getAttribute("y2")),
    }));
    const arrowBefore = await arrow();
    const distanceToTarget = Math.hypot(arrowBefore.x2 - movedT.x, arrowBefore.y2 - movedT.y);
    check("N-7a", "Aboreszenzpfeil beginnt am verschobenen Knoten", same({ x: arrowBefore.x1, y: arrowBefore.y1 }, movedB));
    check("N-7b", "Pfeilspitze endet sichtbar am Rand des Zielknotens (Radius 16)",
      distanceToTarget > 16 && distanceToTarget < 24, `Abstand zur Knotenmitte ${distanceToTarget.toFixed(1)}`);
    await dragNode("B", 30, -60);
    const draggedB = await graphPosition("B");
    const arrowAfter = await arrow();
    check("N-7c", "Aboreszenzpfeil folgt dem verschobenen Knoten", same({ x: arrowAfter.x1, y: arrowAfter.y1 }, draggedB));
    await shot("bonsai_verschoben.png", graphSection);
    await strategy(/Kürzester Pfad/);
    await choose("Zielknoten", "A");
    await choose("Routingmetrik", "hop_count");

    // --- 7: Zurücksetzen -----------------------------------------------------
    await clickEdge("B", "T");
    await resetButton.click();
    check("N-8a", "Zurücksetzen stellt die ursprünglichen Positionen wieder her",
      same(await graphPosition("B"), before.B) && same(await graphPosition("T"), before.T));
    check("N-8b", "Zurücksetzen erhält die Ausfälle", /\(1\)/.test(await activeFailures()));
    check("N-8c", "Nach dem Zurücksetzen ist die Schaltfläche wieder inaktiv", await resetButton.isDisabled());
    await clickEdge("B", "T");
    check("N-3c", "Erneuter Klick stellt die Kante wieder her", /\(0\)/.test(await activeFailures()));
    const tableAfterAll = await routeTable();
    check("N-8d", "Fachlicher Zustand entspricht wieder dem Ausgang", tableAfterAll === tableBefore);
    await page.getByRole("button", { name: /Einklappen/ }).click();

    // --- 9: Drag außerhalb der Graphfläche beenden --------------------------
    const failuresBefore = await activeFailures();
    const start = await screenCenter("X");
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(100, 400, { steps: 6 });
    const outsideCenter = await screenCenter("X");
    const area = await graph.boundingBox();
    await page.mouse.up();
    await page.waitForTimeout(150);
    const released = await graphPosition("X");
    await page.mouse.move(700, 600, { steps: 4 });
    await page.waitForTimeout(150);
    check("N-9a", "Nach dem Loslassen außerhalb hängt kein Knoten an der Maus", same(await graphPosition("X"), released));
    check("N-9b", "Drag außerhalb löst keinen Kantenausfall aus", (await activeFailures()) === failuresBefore);
    check("N-9c", "Knoten bleibt beim Ziehen über den Rand in der sichtbaren Graphfläche",
      outsideCenter.x >= area.x && outsideCenter.x <= area.x + area.width
        && outsideCenter.y >= area.y && outsideCenter.y <= area.y + area.height,
      `Knotenmitte x ${Math.round(outsideCenter.x)}, Fläche ab x ${Math.round(area.x)}`);
    await resetButton.click();

    // Loslassen über einer Kante darf keinen Ausfall auslösen.
    const edgeBox = await edge("A", "B").locator("line").first().boundingBox();
    const startX = await screenCenter("X");
    await page.mouse.move(startX.x, startX.y);
    await page.mouse.down();
    await page.mouse.move(edgeBox.x + edgeBox.width / 2, edgeBox.y + edgeBox.height / 2, { steps: 8 });
    await page.mouse.up();
    await settle();
    check("N-9d", "Loslassen über einer Kante löst keinen Kantenausfall aus", /\(0\)/.test(await activeFailures()));
    await resetButton.click();

    // --- 8: Topologiewechsel -------------------------------------------------
    await dragNode("B", 40, -40);
    await upload(FIXTURES.other);
    check("N-10a", "Andere Topologie: keine manuelle Anordnung übernommen", await resetButton.isDisabled());
    // Diese Topologie besitzt zwei Aboreszenzen.
    await strategy(/Bonsai \(Greedy\)/);
    await dragNode("1", 50, 30);
    const draggedOther = await graphPosition("1");
    const treeSelect = page.locator("aside select").nth(3);
    const treeCount = await treeSelect.locator("option").count();
    await treeSelect.selectOption({ index: treeCount - 1 });
    await settle();
    check("N-4b", "Wechsel der angezeigten Aboreszenz erhält die Anordnung",
      treeCount > 1 && same(await graphPosition("1"), draggedOther), `${treeCount} Aboreszenzen wählbar`);
    await shot("bonsai_zweiter_baum.png", graphSection);
    await upload(FIXTURES.small);
    check("N-10b", "Erneuter Import nach Topologiewechsel: ursprüngliche Positionen",
      same(await graphPosition("B"), before.B) && await resetButton.isDisabled());
    await dragNode("B", -60, -60);
    await upload(FIXTURES.small);
    check("N-10c", "Dieselbe Datei direkt erneut importiert: ursprüngliche Positionen",
      same(await graphPosition("B"), before.B) && await resetButton.isDisabled());

    // --- Tooltip an einem weit verschobenen Knoten ---------------------------
    await upload(FIXTURES.large);
    await page.getByRole("button", { name: "Herauszoomen" }).click();
    await page.getByRole("button", { name: "Herauszoomen" }).click();
    const largeArea = await graph.boundingBox();
    const from = await screenCenter("20");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(largeArea.x + 40, largeArea.y + largeArea.height - 60, { steps: 8 });
    await page.mouse.up();
    await page.mouse.move(largeArea.x + 300, largeArea.y + 200);
    const far = await screenCenter("20");
    await page.mouse.move(far.x, far.y);
    await page.waitForTimeout(200);
    const farPosition = await graphPosition("20");
    const tooltip = await page.locator('svg g[aria-hidden="true"] rect').evaluateAll(items => items.map(item => ({
      x: Number(item.getAttribute("x")), y: Number(item.getAttribute("y")), width: Number(item.getAttribute("width")),
    })));
    const tooltipBox = await page.locator('svg g[aria-hidden="true"] rect').first().boundingBox().catch(() => null);
    const gap = tooltip.length ? Math.abs(tooltip[0].x + tooltip[0].width / 2 - farPosition.x) : Infinity;
    check("N-11a", "Tooltip erscheint an einem weit verschobenen Knoten (höchstens 60 Einheiten seitlich versetzt)",
      gap <= 60, `Knoten x ${farPosition.x.toFixed(0)}, seitlicher Versatz ${Number.isFinite(gap) ? gap.toFixed(0) : "kein Tooltip"}`);
    check("N-11b", "Tooltip liegt vollständig in der sichtbaren Graphfläche",
      tooltipBox && tooltipBox.x >= largeArea.x && tooltipBox.x + tooltipBox.width <= largeArea.x + largeArea.width
        && tooltipBox.y >= largeArea.y && tooltipBox.y + tooltipBox.height <= largeArea.y + largeArea.height);
    await shot("tooltip_weit_verschoben.png", graphSection);

    // --- 10: kleine Fensterbreite --------------------------------------------
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(300);
    const toolbar = await page.getByRole("toolbar").boundingBox();
    const narrow = await graph.boundingBox();
    check("N-12", "Werkzeugleiste bleibt bei 900 px Fensterbreite innerhalb der Graphfläche",
      toolbar.x >= narrow.x && toolbar.x + toolbar.width <= narrow.x + narrow.width + 1,
      `Leiste ${Math.round(toolbar.width)} px, Fläche ${Math.round(narrow.width)} px`);
    check("N-13", "Keine Konsolenfehler in dieser Prüfgruppe", consoleErrors.length === 0, consoleErrors[0] ?? "");
  },
};
