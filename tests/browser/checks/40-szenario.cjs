// Paket 3: Szenarien über die Oberfläche speichern und laden.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

module.exports = {
  name: "Paket 3: Szenario speichern und laden",
  async run(context) {
    const {
      page, check, settle, upload, shot, clickEdge, activeFailures, choose, strategy,
      routeTable, consoleErrors, FIXTURES,
    } = context;
    const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "szenario-"));
    const scenarioInput = page.locator('input[type="file"][aria-label="Szenariodatei auswählen"]');
    const saveButton = page.getByRole("button", { name: "Szenario speichern" });
    const loadScenario = async file => { await scenarioInput.setInputFiles(file); await settle(); };
    const save = async name => {
      const [download] = await Promise.all([page.waitForEvent("download"), saveButton.click()]);
      const target = path.join(workDirectory, name);
      await download.saveAs(target);
      await settle();
      return { target, suggested: download.suggestedFilename() };
    };
    // Fachlich sichtbarer Zustand der Oberfläche.
    const visibleState = async () => {
      const table = await routeTable();
      const interpretation = await page.locator("text=/aktive.? Kantenausf/").last().innerText();
      await page.getByRole("button", { name: /Einklappen/ }).click();
      return {
        target: await page.locator("aside select").nth(0).inputValue(),
        metric: await page.locator("aside select").nth(1).inputValue(),
        bonsai: await page.getByRole("button", { name: /Bonsai \(Greedy\)/ }).getAttribute("aria-pressed"),
        failures: (await activeFailures()).replace(/\s+/g, " "),
        header: (await page.locator("header").innerText()).replace(/\s+/g, " "),
        status: (await page.locator("main > section").first().locator("div").nth(1).innerText()).replace(/\s+/g, " "),
        table,
        interpretation,
      };
    };
    const section = page.locator("aside").getByText("Szenario", { exact: true }).locator("..");

    check("S-1", "Ohne geladene Topologie ist „Szenario speichern“ inaktiv, „Szenario laden“ aktiv",
      await saveButton.isDisabled() && await page.getByRole("button", { name: "Szenario laden" }).isEnabled());
    await shot("leer.png", page.locator("aside"));

    // --- Bonsai: konfigurieren, Ausfall setzen, speichern --------------------
    await upload(FIXTURES.small);
    await choose("Zielknoten", "T");
    await strategy(/Bonsai \(Greedy\)/);
    await clickEdge("A", "T");
    const bonsaiState = await visibleState();
    const bonsaiFile = await save("bonsai.json");
    const bonsaiData = JSON.parse(fs.readFileSync(bonsaiFile.target, "utf-8"));
    check("S-2", "Gespeicherte Datei enthält Formatversion, Topologie, Ziel, Verfahren, Metrik und Ausfälle",
      bonsaiData.format_version === "1.0" && bonsaiData.topology.nodes.length === 4
        && bonsaiData.routing.target_node_id === "T" && bonsaiData.routing.strategy === "bonsai_greedy"
        && bonsaiData.routing.weight_mode === "hop_count"
        && JSON.stringify(bonsaiData.failures.failed_edge_ids) === '["a"]',
      bonsaiFile.suggested);
    check("S-3", "Dateiname beginnt mit „szenario-“ und nennt die Topologie",
      /^szenario-bonsai-routing-failure-demo-\d{8}-\d{4}\.json$/.test(bonsaiFile.suggested), bonsaiFile.suggested);
    check("S-4", "Bonsai-Zustand zeigt vor dem Speichern einen Routingfehler", /Bonsai-Schleife/.test(bonsaiState.table));

    // --- Kürzester Pfad auf großer Topologie ---------------------------------
    await upload(FIXTURES.large);
    await choose("Zielknoten", "7");
    await choose("Routingmetrik", "edge_weight");
    // Zwei Ausfälle über die Kantenauswahl der Seitenleiste.
    const edgeSelect = page.locator("aside select").filter({ has: page.locator("option", { hasText: "↔" }) }).first();
    for (const index of [5, 30]) {
      await edgeSelect.selectOption({ index });
      await page.getByRole("button", { name: /Ausgewählte Kante ausfallen lassen/ }).click();
      await settle();
    }
    const shortestState = await visibleState();
    const shortestFile = await save("kuerzester-pfad.json");
    check("S-5", "Kürzester-Pfad-Zustand hat zwei Ausfälle und Kantengewicht",
      /\(2\)/.test(shortestState.failures) && shortestState.metric === "edge_weight");

    // --- Neustart der Oberfläche, dann laden ---------------------------------
    await page.reload();
    await page.waitForTimeout(300);
    check("S-6", "Nach dem Neuladen der Seite ist kein Zustand mehr vorhanden",
      await page.getByText("Noch keine Topologie geladen").isVisible());
    await loadScenario(bonsaiFile.target);
    const bonsaiRestored = await visibleState();
    check("S-7", "Bonsai-Szenario: Ziel, Verfahren, Metrik und Ausfälle sind wiederhergestellt",
      bonsaiRestored.target === "T" && bonsaiRestored.bonsai === "true"
        && bonsaiRestored.metric === bonsaiState.metric && bonsaiRestored.failures === bonsaiState.failures);
    check("S-8", "Bonsai-Szenario: Kennzahlen, Routingzusammenfassung und Interpretation stimmen überein",
      JSON.stringify(bonsaiRestored) === JSON.stringify(bonsaiState),
      Object.keys(bonsaiState).filter(key => bonsaiState[key] !== bonsaiRestored[key]).join(", "));
    const sectionText = (await section.innerText()).replace(/\s+/g, " ");
    check("S-9", "Der Bereich „Szenario“ nennt die geladene Datei", sectionText.includes("Geladenes Szenario: bonsai.json"), sectionText.slice(-80));
    const uploaderText = (await page.locator("aside").getByText("Topologie laden", { exact: true }).locator("..").innerText()).replace(/\s+/g, " ");
    check("S-10", "Der Bereich „Topologie laden“ zeigt dabei keine Topologiedatei als geladen an",
      !/\.json Klicken zum Ersetzen/.test(uploaderText) && uploaderText.includes("Drag & Drop"), uploaderText.slice(0, 90));
    await shot("geladen_bonsai.png");

    await loadScenario(shortestFile.target);
    const shortestRestored = await visibleState();
    check("S-11", "Kürzester-Pfad-Szenario: gesamter sichtbarer fachlicher Zustand stimmt überein",
      JSON.stringify(shortestRestored) === JSON.stringify(shortestState),
      Object.keys(shortestState).filter(key => shortestState[key] !== shortestRestored[key]).join(", "));

    // Ein geladenes Szenario lässt sich wie gewohnt weiterbearbeiten.
    await page.getByRole("button", { name: "Alle Kanten wiederherstellen" }).click();
    await settle();
    check("S-12", "Geladenes Szenario lässt sich weiterbearbeiten", /\(0\)/.test(await activeFailures()));
    await loadScenario(shortestFile.target);
    check("S-13", "Dasselbe Szenario lässt sich direkt erneut laden", /\(2\)/.test(await activeFailures()));

    // --- Fehlerfälle: der gültige Zustand bleibt erhalten --------------------
    const valid = await visibleState();
    const write = (name, content) => {
      const target = path.join(workDirectory, name);
      fs.writeFileSync(target, content);
      return target;
    };
    const alertText = async () => (await section.locator('[role="alert"]').innerText()).replace(/\s+/g, " ");
    const expectUnchanged = async (id, description, expected) => {
      const message = await alertText().catch(() => "");
      const state = await visibleState();
      check(id, description, expected.test(message) && JSON.stringify(state) === JSON.stringify(valid), message);
    };
    const newer = { ...bonsaiData, format_version: "2.0" };
    await loadScenario(write("version-2.json", JSON.stringify(newer)));
    await expectUnchanged("S-14", "Nicht unterstützte Formatversion: verständliche Meldung, Zustand unverändert", /Formatversion „2\.0“ wird nicht unterstützt/);
    await shot("fehler_version.png", page.locator("aside"));
    const missing = { ...bonsaiData };
    delete missing.format_version;
    await loadScenario(write("ohne-version.json", JSON.stringify(missing)));
    await expectUnchanged("S-15", "Fehlende Formatversion: verständliche Meldung, Zustand unverändert", /keine Formatversion/);
    await loadScenario(FIXTURES.other);
    await expectUnchanged("S-16", "Topologiedatei über „Szenario laden“: Hinweis auf „Topologie laden“, Zustand unverändert", /Topologie laden/);
    await loadScenario(write("kaputt.json", "{ das ist kein json"));
    await expectUnchanged("S-17", "Ungültige Datei: verständliche Meldung, Zustand unverändert", /kein gültiges JSON/);
    const unknownEdge = { ...bonsaiData, failures: { failed_edge_ids: ["gibt-es-nicht"] } };
    delete unknownEdge.routing_snapshot;
    await loadScenario(write("unbekannte-kante.json", JSON.stringify(unknownEdge)));
    await expectUnchanged("S-18", "Unbekannte Kante im Szenario: abgewiesen, Zustand unverändert", /ungültig/);

    // Szenariodatei über „Topologie laden“.
    await upload(bonsaiFile.target);
    const topologyAlert = (await page.locator("aside").getByText("Topologie laden", { exact: true }).locator("..").locator('[role="alert"]').innerText().catch(() => "")).replace(/\s+/g, " ");
    const afterWrongUpload = await visibleState();
    check("S-19", "Szenariodatei über „Topologie laden“: Fehlermeldung dort, Zustand unverändert",
      topologyAlert.length > 0 && JSON.stringify(afterWrongUpload) === JSON.stringify(valid), topologyAlert);

    // Manipulierte gespeicherte Ergebnisse werden nicht übernommen.
    const tampered = JSON.parse(JSON.stringify(bonsaiData));
    for (const key of Object.keys(tampered.routing_snapshot.current_paths)) tampered.routing_snapshot.current_paths[key] = null;
    tampered.routing_snapshot.affected_node_ids = ["A", "B", "X"];
    await loadScenario(write("manipuliert.json", JSON.stringify(tampered)));
    const tamperedState = await visibleState();
    const tamperedSection = (await section.innerText()).replace(/\s+/g, " ");
    check("S-20", "Manipulierte Ergebnisse: angezeigt wird die Neuberechnung, mit Hinweis",
      tamperedState.table === bonsaiState.table && /weichen von der Neuberechnung ab/.test(tamperedSection));
    await shot("abweichende_ergebnisse.png", page.locator("aside"));

    // Danach eine Topologie laden: die Szenario-Anzeige verschwindet.
    await upload(FIXTURES.other);
    const afterTopology = (await section.innerText()).replace(/\s+/g, " ");
    check("S-21", "Nach „Topologie laden“ wird kein geladenes Szenario mehr angezeigt", !afterTopology.includes("Geladenes Szenario"));
    check("S-22", "Keine unerwarteten Konsolenfehler",
      consoleErrors.filter(message => !/status of 4(13|15|22)/.test(message)).length === 0,
      consoleErrors.filter(message => !/status of 4(13|15|22)/.test(message))[0] ?? "");
    fs.rmSync(workDirectory, { recursive: true, force: true });
  },
};
