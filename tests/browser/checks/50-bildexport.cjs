// Bildexport: Graph als SVG und PNG.
//
// Die erzeugten Dateien werden nicht nur angelegt, sondern geöffnet: das SVG
// als eigenständiges Dokument in einer eigenen Seite und als XML geparst, das
// PNG vom Browser dekodiert und Pixel für Pixel ausgewertet.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const COLORS = { T1: "#39ff14", T2: "#c084fc", RED: "#ff4040", GOLD: "#fbbf24", IDLE: "#64708a", TREE: "#a78bfa" };
const BACKGROUND = "#131720";
const SEPARATOR = "#252b3b";
// Der Aboreszenzpfeil wird mit Deckkraft 0,92 über den Hintergrund gezeichnet.
const TREE_ON_BACKGROUND = "#9b82e9";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// --- Auswertung im Browser -----------------------------------------------------
// Die Funktionen laufen in der Seite und liefern nur einfache Werte zurück.

// Zeichnung als Daten: Kanten (Linien mit Farbe, Strichmuster, Pfeil, Breite),
// Knoten (Kreis, Farbe, Namen) und alles, was nicht ins Bild gehört.
const readScene = scene => {
  const isLine = line => line.getAttribute("stroke") !== "transparent" && line.getAttribute("stroke") !== "#38bdf8";
  const edges = [...scene.children]
    .filter(child => child.tagName === "g" && !child.hasAttribute("data-graph-node-id"))
    .map(group => ({
      lines: [...group.querySelectorAll("line")].filter(isLine).map(line => ({
        stroke: line.getAttribute("stroke"),
        dash: line.getAttribute("stroke-dasharray"),
        marker: line.getAttribute("marker-end"),
        opacity: line.getAttribute("opacity"),
        width: Number(line.getAttribute("data-export-stroke-width") ?? line.getAttribute("stroke-width")),
      })),
      crosses: [...group.querySelectorAll("text")].map(text => text.textContent),
    }));
  const nodes = [...scene.querySelectorAll(":scope > g[data-graph-node-id]")].map(group => {
    const circles = [...group.querySelectorAll("circle")];
    const main = circles[circles.length - 1];
    const texts = [...group.querySelectorAll("text")].map(text => text.textContent);
    return {
      id: group.getAttribute("data-graph-node-id"),
      x: Number(main.getAttribute("cx")),
      y: Number(main.getAttribute("cy")),
      stroke: main.getAttribute("stroke"),
      strokeWidth: Number(main.getAttribute("stroke-width")),
      halo: circles.length > 1,
      abbreviation: texts[0],
      label: texts[1] ?? null,
    };
  });
  return { edges, nodes };
};

const analyseSvgText = text => {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const error = doc.querySelector("parsererror");
  const root = doc.documentElement;
  const scene = doc.querySelector("g[data-graph-scene]");
  const forbidden = ['[role="button"]', "[tabindex]", "[aria-label]", "[style]", "[vector-effect]", "[pointer-events]",
    "[data-export]", "[data-export-stroke-width]", "[data-pan-surface]", '[stroke="transparent"]', '[stroke="#38bdf8"]',
    "image", "use", "script", "foreignObject", "a", "[href]", "[xlink\\:href]"]
    .map(selector => [selector, doc.querySelectorAll(selector).length])
    .filter(([, count]) => count > 0);
  const colors = new Set();
  doc.querySelectorAll("[stroke],[fill]").forEach(node => {
    ["stroke", "fill"].forEach(name => {
      const value = node.getAttribute(name);
      if (value && value !== "none") colors.add(value);
    });
  });
  // Legende: Reihenfolge der Symbole und Beschriftungen nach der Überschrift.
  const children = [...root.children];
  const legendStart = children.findIndex(child => child.tagName === "text" && child.textContent === "Legende");
  const legend = [];
  let pending = [];
  for (const child of children.slice(legendStart + 1)) {
    if (child.tagName === "text") {
      legend.push({ label: child.textContent, color: pending[0] ?? null });
      pending = [];
    } else {
      pending.push(child.getAttribute("stroke") ?? child.getAttribute("fill"));
    }
  }
  return {
    wellFormed: !error,
    error: error ? error.textContent.slice(0, 160) : "",
    namespace: root.namespaceURI,
    width: Number(root.getAttribute("width")),
    height: Number(root.getAttribute("height")),
    viewBox: root.getAttribute("viewBox"),
    texts: [...doc.querySelectorAll("text")].map(node => node.textContent),
    forbidden,
    colors: [...colors],
    legend,
    // Das einzige Rechteck ist der Hintergrund; Tooltip und Klickfläche sind Rechtecke.
    rects: doc.querySelectorAll("rect").length,
    markers: doc.querySelectorAll("marker#tree-arrow").length,
    arrows: doc.querySelectorAll("line[marker-end]").length,
    sceneOffset: scene?.parentElement?.getAttribute("transform") ?? null,
    scene: scene ? readScene(scene) : null,
  };
};

// Dekodiert ein PNG im Browser und wertet seine Pixel aus.
const analysePixels = async ({ base64, palette, frame }) => {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0);
  const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height);
  const hex = value => [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
  const background = hex(palette.background);
  const near = (offset, target, tolerance) => (
    Math.abs(data[offset] - target[0]) + Math.abs(data[offset + 1] - target[1]) + Math.abs(data[offset + 2] - target[2]) <= tolerance
  );
  const separator = hex(palette.separator);
  let dirtyFrame = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inFrame = x < frame || y < frame || x >= width - frame || y >= height - frame;
      // Die Trennlinien zwischen Kopfzeile, Zeichnung und Legende laufen über die ganze Breite.
      if (inFrame && !near((y * width + x) * 4, background, 3) && !near((y * width + x) * 4, separator, 8)) dirtyFrame += 1;
    }
  }
  const counts = {};
  Object.entries(palette.colors).forEach(([name, color]) => {
    const target = hex(color);
    let count = 0;
    for (let offset = 0; offset < data.length; offset += 4) if (near(offset, target, 14)) count += 1;
    counts[name] = count;
  });
  let backgroundPixels = 0;
  for (let offset = 0; offset < data.length; offset += 4) if (near(offset, background, 3)) backgroundPixels += 1;
  const corner = [...data.slice(0, 4)];
  return {
    width, height, corner, dirtyFrame, counts,
    opaque: data.every((value, index) => index % 4 !== 3 || value === 255),
    nonBackgroundRatio: 1 - backgroundPixels / (width * height),
  };
};

// Anteil der Pixel, die sich in zwei gleich großen Bildern deutlich unterscheiden.
const differingPixels = async ({ left, right }) => {
  const decode = async base64 => {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  };
  const [a, b] = [await decode(left), await decode(right)];
  if (a.width !== b.width || a.height !== b.height) return { sameSize: false, a: [a.width, a.height], b: [b.width, b.height] };
  let different = 0;
  for (let offset = 0; offset < a.data.length; offset += 4) {
    const distance = Math.abs(a.data[offset] - b.data[offset]) + Math.abs(a.data[offset + 1] - b.data[offset + 1])
      + Math.abs(a.data[offset + 2] - b.data[offset + 2]);
    if (distance > 90) different += 1;
  }
  return { sameSize: true, fraction: different / (a.width * a.height) };
};

module.exports = {
  name: "Bildexport: Graph als SVG und PNG",
  async run(context) {
    const {
      page, check, settle, upload, clickEdge, dragNode, graphPosition, nodeCircle, screenCenter, choose, strategy,
      openDetails, consoleErrors, apiRequests, FIXTURES, ROOT,
    } = context;
    const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bildexport-"));
    const browser = page.context().browser();
    const palette = { background: BACKGROUND, separator: SEPARATOR, colors: { ...COLORS, TREE: TREE_ON_BACKGROUND } };
    let fileCounter = 0;

    const exportButton = kind => page.getByRole("button", { name: `Graph als ${kind.toUpperCase()}-Bild herunterladen` });
    const exportImage = async kind => {
      const [download] = await Promise.all([page.waitForEvent("download"), exportButton(kind).click()]);
      fileCounter += 1;
      const target = path.join(workDirectory, `${String(fileCounter).padStart(2, "0")}-${download.suggestedFilename()}`);
      await download.saveAs(target);
      await page.waitForTimeout(80);
      return { target, suggested: download.suggestedFilename() };
    };
    const exportSvg = async () => {
      const file = await exportImage("svg");
      return { ...file, text: fs.readFileSync(file.target, "utf-8") };
    };
    const exportPng = async () => {
      const file = await exportImage("png");
      return { ...file, bytes: fs.readFileSync(file.target) };
    };
    const pngSize = bytes => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
    // Die Funktionen laufen in der Seite; `readScene` muss dort mitgeliefert werden.
    const analyseSvg = text => page.evaluate(
      `(() => { const readScene = ${readScene.toString()}; return (${analyseSvgText.toString()})(${JSON.stringify(text)}); })()`,
    );
    const pixels = (bytes, frame = 8) => page.evaluate(analysePixels, { base64: bytes.toString("base64"), palette, frame });

    // Öffnet die Datei als eigenständiges Dokument (wie ein Doppelklick im Browser)
    // und liefert Aufnahme und alle Netzwerkzugriffe zurück.
    const openStandalone = async (file, { width, height, scale = 1 }) => {
      const viewerContext = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
      const viewer = await viewerContext.newPage();
      const requests = [];
      viewer.on("request", request => { if (!request.url().startsWith("file:")) requests.push(request.url()); });
      await viewer.goto(pathToFileURL(file).href);
      const rendered = await viewer.evaluate(() => ({
        element: document.documentElement.tagName,
        contentType: document.contentType,
        parserError: Boolean(document.querySelector("parsererror")),
        outside: [...document.querySelectorAll("text, circle, line, path")].filter(node => {
          const box = node.getBoundingClientRect();
          return box.width > 0 && (box.left < 0 || box.top < 0 || box.right > innerWidth + 0.5 || box.bottom > innerHeight + 0.5);
        }).length,
      }));
      const shot = await viewer.screenshot();
      await viewerContext.close();
      return { ...rendered, requests, shot };
    };

    // Fachlich sichtbarer Zustand und gesamte Ansicht, um Veränderungen zu erkennen.
    const snapshot = async () => {
      await openDetails();
      const logButton = page.getByRole("button", { name: /Ereignisprotokoll anzeigen/ });
      if (await logButton.count()) await logButton.click();
      return page.evaluate(() => ({
        graph: document.querySelector('svg[aria-label^="Netzwerkgraph"]').innerHTML,
        zoom: document.querySelector("output").textContent,
        pressed: [...document.querySelectorAll("button[aria-pressed]")].map(button => button.getAttribute("aria-pressed")),
        header: document.querySelector("header").innerText,
        aside: [...document.querySelectorAll("aside select")].map(select => select.value),
        failures: document.querySelector("aside").innerText.match(/Aktive Ausfälle \(\d+\)/)?.[0],
        table: document.querySelector("#routing-detail-panels table tbody").innerText,
        logLines: [...document.querySelectorAll("#event-log-panel > div:nth-child(2) > div")].map(line => line.innerText.replace(/^\[[\d:]+\] /, "")).filter(Boolean),
      }));
    };
    const liveScene = () => page.evaluate(`(${readScene.toString()})(document.querySelector("g[data-graph-scene]"))`);
    const liveLegend = () => page.evaluate(() => {
      const legend = [...document.querySelectorAll("main > section")][0].lastElementChild;
      return [...legend.querySelectorAll(":scope > span")].map(item => ({
        label: item.lastChild.textContent.trim(),
        color: getComputedStyle(item.firstElementChild).color,
      }));
    });
    const rgbToHex = value => `#${value.match(/\d+/g).slice(0, 3).map(part => Number(part).toString(16).padStart(2, "0")).join("")}`;
    const failEdgeThroughSidebar = async indexes => {
      const edgeSelect = page.locator("aside select").filter({ has: page.locator("option", { hasText: "↔" }) }).first();
      for (const index of indexes) {
        await edgeSelect.selectOption({ index });
        await page.getByRole("button", { name: /Ausgewählte Kante ausfallen lassen/ }).click();
        await settle();
      }
    };
    // Ein Punkt der freien Fläche, an dem ein Ziehen den Ausschnitt verschiebt.
    const freePoint = () => page.evaluate(() => {
      const box = document.querySelector('svg[aria-label^="Netzwerkgraph"]').getBoundingClientRect();
      for (let y = box.top + 60; y < box.bottom - 20; y += 23) {
        for (let x = box.left + 40; x < box.right - 20; x += 29) {
          if (document.elementFromPoint(x, y)?.dataset.panSurface === "true") return { x, y };
        }
      }
      return null;
    });
    const zoomToMaximum = async () => {
      for (let step = 0; step < 9; step += 1) await page.getByRole("button", { name: "Hineinzoomen" }).click();
      await page.waitForTimeout(100);
    };
    const labelCount = scene => scene.nodes.filter(node => node.label !== null).length;
    // Die Koordinaten im Bild sind verschoben; verglichen wird alles andere.
    const withoutPosition = node => ({ ...node, x: undefined, y: undefined });

    // --- Ohne Topologie ------------------------------------------------------------
    check("E-1", "Ohne geladene Topologie gibt es keine Schaltflächen für den Bildexport",
      await exportButton("svg").count() === 0 && await exportButton("png").count() === 0);

    // --- Bonsai mit Kantenausfall ----------------------------------------------------
    await upload(FIXTURES.small);
    await strategy(/Bonsai \(Greedy\)/);
    await clickEdge("A", "T");
    check("E-2", "Mit geladener Topologie sind die Schaltflächen „SVG“ und „PNG“ sichtbar und bedienbar; Tooltip nennt die Aktion",
      await exportButton("svg").isEnabled() && await exportButton("png").isEnabled()
        && await exportButton("svg").innerText() === "SVG" && await exportButton("png").innerText() === "PNG"
        && /Gesamte Topologie als SVG-Bild/.test(await exportButton("svg").getAttribute("title"))
        && /Gesamte Topologie als PNG-Bild/.test(await exportButton("png").getAttribute("title")));

    const bonsaiBefore = await snapshot();
    const apiBefore = apiRequests.length;
    const bonsaiSvg = await exportSvg();
    const bonsaiSvgData = await analyseSvg(bonsaiSvg.text);
    check("E-3", "SVG: Datei „graph-<Topologie>-<Datum>-<Uhrzeit>.svg“, gültiges XML, Namensraum und Größe angegeben",
      /^graph-bonsai-routing-failure-demo-\d{8}-\d{4}\.svg$/.test(bonsaiSvg.suggested)
        && bonsaiSvg.text.startsWith('<?xml version="1.0" encoding="UTF-8"?>')
        && bonsaiSvgData.wellFormed && bonsaiSvgData.namespace === "http://www.w3.org/2000/svg"
        && bonsaiSvgData.width > 0 && bonsaiSvgData.viewBox === `0 0 ${bonsaiSvgData.width} ${bonsaiSvgData.height}`,
      `${bonsaiSvg.suggested} ${bonsaiSvgData.width}×${bonsaiSvgData.height} ${bonsaiSvgData.error}`);

    const externalReferences = (bonsaiSvg.text.match(/https?:\/\/[^"'\s<>]+/g) ?? []).filter(url => url !== "http://www.w3.org/2000/svg");
    const standalone = await openStandalone(bonsaiSvg.target, bonsaiSvgData);
    check("E-4", "SVG ist eigenständig: keine externen Verweise, keine Skripte, keine Bedienelemente; als Dokument geöffnet ohne Netzwerkzugriff",
      externalReferences.length === 0 && bonsaiSvgData.forbidden.length === 0 && bonsaiSvgData.rects === 1 && standalone.element === "svg"
        && standalone.contentType === "image/svg+xml" && !standalone.parserError && standalone.requests.length === 0,
      JSON.stringify({ externalReferences, forbidden: bonsaiSvgData.forbidden, requests: standalone.requests }));

    const liveBonsai = await liveScene();
    check("E-5", "SVG zeigt dieselben Kanten wie die Ansicht: Farbe, Strichmuster, Breite, Pfeile und Ausfallmarkierung",
      JSON.stringify(bonsaiSvgData.scene.edges) === JSON.stringify(liveBonsai.edges)
        && bonsaiSvgData.scene.edges.length === 4,
      `Ansicht ${liveBonsai.edges.length} / SVG ${bonsaiSvgData.scene.edges.length} Kanten`);
    check("E-6", "SVG zeigt dieselben Knoten wie die Ansicht: Kennung, Rand, Zielmarkierung und Namen",
      JSON.stringify(bonsaiSvgData.scene.nodes.map(withoutPosition))
        === JSON.stringify(liveBonsai.nodes.map(withoutPosition))
        && bonsaiSvgData.scene.nodes.length === 4,
      bonsaiSvgData.scene.nodes.map(node => `${node.id}:${node.stroke}`).join(" "));

    const arrowsLive = liveBonsai.edges.flatMap(edge => edge.lines).filter(line => line.marker).length;
    check("E-7", "Bonsai: Pfeile der gewählten Aboreszenz samt Pfeilspitze sind im SVG",
      arrowsLive > 0 && bonsaiSvgData.arrows === arrowsLive && bonsaiSvgData.markers === 1,
      `${bonsaiSvgData.arrows} Pfeile, Ansicht ${arrowsLive}`);

    const strokeColors = bonsaiSvgData.colors;
    const allowed = [
      ...Object.values(COLORS), BACKGROUND, "#181c2c", "#f3f6fc", "#e2e8f4", "#9aa5bb", "#60a5fa", "#22c55e",
      "#0d0f14", "#7a8499", "#252b3b", "none",
    ];
    const stray = strokeColors.filter(color => !allowed.includes(color));
    check("E-8", "SVG verwendet nur Farben der Oberfläche (keine Auswahlfarbe, keine Klickfläche)", stray.length === 0, stray.join(" "));

    const legendLive = await liveLegend();
    const legendSvg = bonsaiSvgData.legend;
    check("E-9", "Legende im SVG entspricht der Legende der Oberfläche: Einträge, Reihenfolge und Farben (mit Aboreszenz)",
      JSON.stringify(legendSvg.map(entry => [entry.label, entry.color]))
        === JSON.stringify(legendLive.map(entry => [entry.label, rgbToHex(entry.color)]))
        && legendSvg.at(-1).label === "Gewählte Aboreszenz",
      legendSvg.map(entry => entry.label).join(" | "));

    const headerTexts = bonsaiSvgData.texts.join(" | ");
    check("E-10", "Kopfzeile nennt Topologie, Zielknoten, Routingverfahren, Ausfälle und die gezeigte Aboreszenz",
      /bonsai-routing-failure-demo/.test(headerTexts) && /Quelle A \(A\)/.test(headerTexts)
        && /Bonsai \(Greedy\)/.test(headerTexts) && /AUSFÄLLE \| 1/.test(headerTexts) && /ABORESZENZ \| T1/.test(headerTexts),
      headerTexts.slice(0, 160));

    const bonsaiPng = await exportPng();
    const bonsaiPngSize = pngSize(bonsaiPng.bytes);
    const bonsaiPixels = await pixels(bonsaiPng.bytes);
    check("E-11", "PNG: Datei „graph-….png“ mit PNG-Signatur, mindestens 1600 Pixel breit, vom Browser dekodierbar",
      /^graph-bonsai-routing-failure-demo-\d{8}-\d{4}\.png$/.test(bonsaiPng.suggested)
        && bonsaiPng.bytes.subarray(0, 8).equals(PNG_SIGNATURE) && bonsaiPngSize.width >= 1600
        && bonsaiPixels.width === bonsaiPngSize.width && bonsaiPixels.height === bonsaiPngSize.height,
      `${bonsaiPng.suggested} ${bonsaiPngSize.width}×${bonsaiPngSize.height}, ${bonsaiPng.bytes.length} Bytes`);
    check("E-12", "PNG ist nicht leer: dunkler Hintergrund, undurchsichtig, Routen-, Ausfall-, Ziel- und Aboreszenzfarben vorhanden",
      bonsaiPixels.opaque && bonsaiPixels.corner.slice(0, 3).join() === "19,23,32" && bonsaiPixels.nonBackgroundRatio > 0.01
        && bonsaiPixels.counts.RED > 100 && bonsaiPixels.counts.GOLD > 100 && bonsaiPixels.counts.T2 > 100
        && bonsaiPixels.counts.TREE > 100 && bonsaiPixels.counts.IDLE > 100,
      JSON.stringify(bonsaiPixels.counts));
    check("E-13", "Nichts ist am Bildrand abgeschnitten: ein Rahmen von 8 Pixeln enthält nur Hintergrund und die durchgehenden Trennlinien",
      bonsaiPixels.dirtyFrame === 0, `${bonsaiPixels.dirtyFrame} abweichende Randpixel`);

    // PNG und SVG zeigen dasselbe: das SVG in der Größe des PNG gerendert.
    const scale = bonsaiPngSize.width / bonsaiSvgData.width;
    const sameScale = await openStandalone(bonsaiSvg.target, { width: bonsaiSvgData.width, height: bonsaiSvgData.height, scale });
    const comparison = await page.evaluate(differingPixels, { left: bonsaiPng.bytes.toString("base64"), right: sameScale.shot.toString("base64") });
    check("E-14", "PNG und SVG zeigen dasselbe Bild (weniger als 2 % abweichende Pixel)",
      comparison.sameSize && comparison.fraction < 0.02, JSON.stringify(comparison));
    check("E-15", "Im geöffneten SVG liegen alle Texte, Knoten und Linien innerhalb des Bildes",
      standalone.outside === 0, `${standalone.outside} Elemente außerhalb`);

    const bonsaiAfter = await snapshot();
    const loggedLines = bonsaiAfter.logLines.slice(bonsaiBefore.logLines.length);
    check("E-16", "Der Export ändert weder Zustand noch Ansicht und löst keine Anfrage an das Backend aus",
      bonsaiAfter.graph === bonsaiBefore.graph && bonsaiAfter.zoom === bonsaiBefore.zoom
        && JSON.stringify(bonsaiAfter.pressed) === JSON.stringify(bonsaiBefore.pressed)
        && bonsaiAfter.header === bonsaiBefore.header && JSON.stringify(bonsaiAfter.aside) === JSON.stringify(bonsaiBefore.aside)
        && bonsaiAfter.failures === bonsaiBefore.failures && bonsaiAfter.table === bonsaiBefore.table
        && apiRequests.length === apiBefore,
      `Anfragen ${apiRequests.length - apiBefore}`);
    check("E-17", "Meldung nennt den gestarteten Download, nicht ein erfolgreiches Speichern (SVG und PNG)",
      loggedLines.length === 2
        && /^Download der SVG-Datei gestartet: graph-.*\.svg\.$/.test(loggedLines[0])
        && /^Download der PNG-Datei gestartet: graph-.*\.png \(\d+ × \d+ Pixel\)\.$/.test(loggedLines[1])
        && !loggedLines.some(line => /gespeichert/i.test(line)),
      loggedLines.join(" // "));

    // --- Gesamte Topologie unabhängig von Zoom und Ausschnitt ------------------------
    const defaultSvg = bonsaiSvg.text;
    await zoomToMaximum();
    const start = await freePoint();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 150, start.y - 60, { steps: 5 });
    await page.mouse.up();
    const zoomText = await page.locator("output").textContent();
    const visibleNodes = [];
    const panel = await page.locator('svg[aria-label^="Netzwerkgraph"]').boundingBox();
    for (const id of ["A", "B", "T", "X"]) {
      const box = await nodeCircle(id).boundingBox();
      visibleNodes.push(box && box.x >= panel.x && box.y >= panel.y && box.x + box.width <= panel.x + panel.width && box.y + box.height <= panel.y + panel.height);
    }
    const zoomedSvg = await exportSvg();
    const zoomedLive = await liveScene();
    check("E-18", "Bei maximalem Zoom und verschobenem Ausschnitt enthält das SVG trotzdem die gesamte Topologie, unverändert gegenüber dem Export bei Standardansicht",
      visibleNodes.some(visible => !visible) && labelCount(zoomedLive) === 4 && zoomedSvg.text === defaultSvg,
      `Zoom ${zoomText}, in der Ansicht sichtbar: ${visibleNodes.join("/")}`);
    const zoomedPng = await exportPng();
    const zoomedPngPixels = await pixels(zoomedPng.bytes);
    check("E-19", "Dasselbe gilt für das PNG: gleiche Größe und kein abgeschnittener Rand",
      JSON.stringify(pngSize(zoomedPng.bytes)) === JSON.stringify(bonsaiPngSize) && zoomedPngPixels.dirtyFrame === 0);
    await page.getByRole("button", { name: "Topologie einpassen" }).click();

    // --- Namen: richten sich nach der Option, nicht nach dem Zoom --------------------
    const withoutNames = analyseSvg(defaultSvg);
    await page.getByRole("button", { name: "Namen", exact: true }).click();
    const namesSvg = await exportSvg();
    const namesData = await analyseSvg(namesSvg.text);
    await zoomToMaximum();
    const namesZoomedSvg = await exportSvg();
    await page.getByRole("button", { name: "Topologie einpassen" }).click();
    const withoutData = await withoutNames;
    check("E-20", "Option „Namen“: ohne sind nur wichtige Namen im Bild, mit allen Namen; unabhängig vom Zoom",
      labelCount(withoutData.scene) === 3 && labelCount(namesData.scene) === 4 && namesZoomedSvg.text === namesSvg.text,
      `ohne ${labelCount(withoutData.scene)}, mit ${labelCount(namesData.scene)} Namen`);
    await page.getByRole("button", { name: "Namen", exact: true }).click();

    // --- Verschobene Knoten ----------------------------------------------------------
    const beforeMove = await graphPosition("B");
    await dragNode("B", -120, 70);
    const movedLive = await liveScene();
    const movedSvg = await exportSvg();
    const movedData = await analyseSvg(movedSvg.text);
    const relative = nodes => nodes.map(node => [node.id, Math.round((node.x - nodes[0].x) * 10) / 10, Math.round((node.y - nodes[0].y) * 10) / 10]);
    const afterMove = await graphPosition("B");
    check("E-21", "Verschobene Knoten stehen im Bild an der verschobenen Stelle (Abstände wie in der Ansicht), Kanten folgen",
      Math.hypot(afterMove.x - beforeMove.x, afterMove.y - beforeMove.y) > 30
        && JSON.stringify(relative(movedData.scene.nodes)) === JSON.stringify(relative(movedLive.nodes))
        && movedSvg.text !== defaultSvg,
      `B: ${Math.round(beforeMove.x)},${Math.round(beforeMove.y)} → ${Math.round(afterMove.x)},${Math.round(afterMove.y)}`);
    const movedPng = await exportPng();
    const movedPixels = await pixels(movedPng.bytes);
    check("E-22", "Nach dem Verschieben bleibt alles im Bild (PNG-Rand sauber, SVG ohne Element außerhalb)",
      movedPixels.dirtyFrame === 0 && (await openStandalone(movedSvg.target, movedData)).outside === 0);
    await page.getByRole("button", { name: "Knotenpositionen zurücksetzen" }).click();

    // --- Routenanzeige ---------------------------------------------------------------
    await choose("Route hervorheben", "B");
    const routeSvg = await exportSvg();
    const routeData = await analyseSvg(routeSvg.text);
    const routeLive = await liveScene();
    check("E-23", "Gewählte Routenanzeige („Route hervorheben“) steht im Bild und in der Kopfzeile",
      JSON.stringify(routeData.scene.edges) === JSON.stringify(routeLive.edges) && /ROUTENANZEIGE \| Route von B/.test(routeData.texts.join(" | "))
        && routeSvg.text !== defaultSvg);
    await choose("Route hervorheben", "__hide_routes__");
    const hiddenSvg = await exportSvg();
    const hiddenData = await analyseSvg(hiddenSvg.text);
    const hiddenLive = await liveScene();
    check("E-24", "„Keine Route hervorheben“ steht im Bild und in der Kopfzeile; Kanten wie in der Ansicht",
      JSON.stringify(hiddenData.scene.edges) === JSON.stringify(hiddenLive.edges)
        && /Keine Route hervorgehoben/.test(hiddenData.texts.join(" | ")));
    await choose("Route hervorheben", "");

    // --- Kürzester Pfad mit Ausfall, kleine Topologie ----------------------------------
    await strategy(/Kürzester Pfad/);
    const shortestSvg = await exportSvg();
    const shortestData = await analyseSvg(shortestSvg.text);
    const shortestLive = await liveScene();
    check("E-25", "Kürzester Pfad mit Kantenausfall: Kanten und Knoten wie in der Ansicht, keine Aboreszenz in Legende und Kopfzeile, Ausfall mit Kreuz",
      JSON.stringify(shortestData.scene.edges) === JSON.stringify(shortestLive.edges)
        && !shortestData.legend.some(entry => entry.label === "Gewählte Aboreszenz") && shortestData.arrows === 0
        && !/ABORESZENZ/.test(shortestData.texts.join(" | "))
        && shortestData.scene.edges.filter(edge => edge.crosses.includes("×")).length === 1
        && /Kürzester Pfad \(Hop-Anzahl\)/.test(shortestData.texts.join(" | ")),
      shortestData.texts.slice(0, 12).join(" | "));
    const shortestPng = await exportPng();
    const shortestPixels = await pixels(shortestPng.bytes);
    check("E-26", "Kürzester Pfad: PNG mit Ausfall-, Ziel- und Routenfarben, praktisch ohne Aboreszenzfarbe, Rand sauber",
      shortestPixels.counts.RED > 100 && shortestPixels.counts.GOLD > 100
        // Einzelne Randpixel der violetten früheren Route liegen nah an der Farbe des Aboreszenzpfeils.
        && shortestPixels.counts.TREE < bonsaiPixels.counts.TREE / 5
        && shortestPixels.dirtyFrame === 0, JSON.stringify(shortestPixels.counts));

    // --- Große Topologie ---------------------------------------------------------------
    await upload(FIXTURES.large);
    await choose("Zielknoten", "7");
    await choose("Routingmetrik", "edge_weight");
    await failEdgeThroughSidebar([5, 30]);
    const largeLive = await liveScene();
    const started = Date.now();
    const largeSvg = await exportSvg();
    const largePng = await exportPng();
    const elapsed = Date.now() - started;
    const largeData = await analyseSvg(largeSvg.text);
    const largePixels = await pixels(largePng.bytes);
    const largeStandalone = await openStandalone(largeSvg.target, largeData);
    check("E-27", "Große Topologie (50 Knoten, 65 Kanten, 2 Ausfälle): SVG gültig, alle Knoten und Kanten wie in der Ansicht, Kantenmetrik in der Kopfzeile",
      largeData.wellFormed && largeData.scene.nodes.length === 50 && largeData.scene.edges.length === 65
        && JSON.stringify(largeData.scene.edges) === JSON.stringify(largeLive.edges)
        && largeData.scene.edges.filter(edge => edge.crosses.includes("×")).length === 2
        && /Kürzester Pfad \(Kantengewicht\)/.test(largeData.texts.join(" | ")) && largeStandalone.outside === 0,
      `${largeData.scene.nodes.length} Knoten, ${largeData.scene.edges.length} Kanten, ${largeData.width}×${largeData.height}`);
    check("E-28", "Große Topologie: PNG mindestens 1600 Pixel breit, höchstens 8192, Rand sauber, Export in unter 8 Sekunden",
      pngSize(largePng.bytes).width >= 1600 && pngSize(largePng.bytes).width <= 8192 && largePixels.dirtyFrame === 0 && elapsed < 8000,
      `${pngSize(largePng.bytes).width}×${pngSize(largePng.bytes).height}, ${elapsed} ms für SVG und PNG`);
    const denseLive = await (async () => {
      await upload(path.join(ROOT, "tests/fixtures/synthetic_50_nodes_dense.json"));
      return liveScene();
    })();
    const denseSvg = await exportSvg();
    const densePng = await exportPng();
    const denseData = await analyseSvg(denseSvg.text);
    const densePixels = await pixels(densePng.bytes);
    check("E-29", "Dichte Topologie (50 Knoten, 96 Kanten): alle Kanten wie in der Ansicht, PNG ohne abgeschnittenen Rand",
      denseData.wellFormed && denseData.scene.edges.length === 96
        && JSON.stringify(denseData.scene.edges) === JSON.stringify(denseLive.edges) && densePixels.dirtyFrame === 0,
      `${denseData.scene.edges.length} Kanten`);

    // --- Sonderzeichen in Namen ---------------------------------------------------------
    const special = {
      directed: false,
      multigraph: false,
      graph: { name: "Netz <A> & \"B\" 'C' 🕸\u0001" },
      nodes: [
        { id: "n1", name: "Köln & <Düsseldorf>", pos: [0, 0] },
        { id: "n2", name: "Straße \"Zwei\" 'x' 🕸", pos: [1, 0] },
        { id: "n3", name: "Steuer\u0001zeichen\u0008", pos: [0.5, 1] },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", dist: 1 },
        { id: "e2", source: "n2", target: "n3", dist: 1 },
        { id: "e3", source: "n1", target: "n3", dist: 1 },
      ],
    };
    const specialFile = path.join(workDirectory, "sonderzeichen.json");
    fs.writeFileSync(specialFile, JSON.stringify(special));
    await upload(specialFile);
    await page.getByRole("button", { name: "Namen", exact: true }).click();
    const specialSvg = await exportSvg();
    const specialData = await analyseSvg(specialSvg.text);
    const specialPng = await exportPng();
    const invalidCharacters = [...specialSvg.text].filter(char => {
      const code = char.codePointAt(0);
      return !(code === 9 || code === 10 || code === 13 || (code >= 0x20 && code <= 0xD7FF) || (code >= 0xE000 && code <= 0xFFFD) || code >= 0x10000);
    });
    check("E-33", "Sonderzeichen in Namen (& < > \" ' Umlaute, Emoji, Steuerzeichen): SVG bleibt gültiges XML ohne ungültige Zeichen, Namen sind erhalten, PNG lässt sich erzeugen",
      specialData.wellFormed && invalidCharacters.length === 0
        && specialData.texts.includes("Netz <A> & \"B\" 'C' 🕸")
        && specialData.texts.includes("Köln & <Düsseldorf>") && specialData.texts.includes("Straße \"Zwei\" 'x' 🕸")
        && specialData.texts.includes("Steuerzeichen") && pngSize(specialPng.bytes).width >= 1600
        && (await pixels(specialPng.bytes)).nonBackgroundRatio > 0.005,
      specialData.error || `${invalidCharacters.length} ungültige Zeichen`);

    // --- Tooltip und Fokus gehören nicht ins Bild --------------------------------------
    await page.getByRole("button", { name: "Namen", exact: true }).click();
    const quiet = (await liveScene()).nodes.find(node => node.label === null);
    const quietCenter = await screenCenter(quiet.id);
    await page.mouse.move(quietCenter.x, quietCenter.y);
    await page.waitForTimeout(120);
    const tooltipShown = await page.locator('svg[aria-label^="Netzwerkgraph"] g[aria-hidden="true"]').count();
    await exportButton("svg").focus();
    const [keyboardDownload] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
    const keyboardFile = path.join(workDirectory, "tastatur.svg");
    await keyboardDownload.saveAs(keyboardFile);
    const keyboardData = await analyseSvg(fs.readFileSync(keyboardFile, "utf-8"));
    check("E-34", "Bei angezeigtem Namens-Tooltip und fokussierter Schaltfläche (Auslösen per Tastatur) enthält das Bild weder Tooltip noch Fokusrahmen",
      tooltipShown === 1 && keyboardData.wellFormed && keyboardData.forbidden.length === 0 && keyboardData.rects === 1,
      `Tooltip in der Ansicht: ${tooltipShown}, Verbotenes im Bild: ${JSON.stringify(keyboardData.forbidden)}, Rechtecke: ${keyboardData.rects}`);
    await page.mouse.move(5, 5);

    await upload(FIXTURES.small);
    await strategy(/Bonsai \(Greedy\)/);
    await clickEdge("A", "T");

    // --- Schmale Fenster --------------------------------------------------------------
    const toolbar = page.getByRole("toolbar", { name: "Graphansicht steuern" });
    const toolbarState = async () => {
      const section = await page.locator("main > section").first().boundingBox();
      const buttons = await toolbar.locator("button").all();
      const boxes = [];
      for (const button of buttons) boxes.push({ name: (await button.innerText()) || (await button.getAttribute("aria-label")), box: await button.boundingBox() });
      const bar = await toolbar.boundingBox();
      const inside = boxes.every(({ box }) => box && box.width > 0 && box.height > 0
        && box.x >= section.x - 0.5 && box.x + box.width <= section.x + section.width + 0.5
        && box.y >= section.y - 0.5 && box.y + box.height <= section.y + section.height + 0.5);
      const visible = boxes.map(({ box }) => box).filter(Boolean);
      const overlapping = visible.some((box, index) => visible.some((other, otherIndex) => index < otherIndex
        && box.x < other.x + other.width - 0.5 && other.x < box.x + box.width - 0.5
        && box.y < other.y + other.height - 0.5 && other.y < box.y + box.height - 0.5));
      const rows = new Set(visible.map(box => Math.round(box.y))).size;
      return { inside, overlapping, rows, barHeight: Math.round(bar.height), section: Math.round(section.height) };
    };
    const narrow = {};
    for (const width of [1440, 900, 700, 560]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      const state = await toolbarState();
      const svg = await exportSvg();
      const png = await exportPng();
      narrow[width] = { ...state, exported: svg.text.length > 1000 && pngSize(png.bytes).width >= 1600 };
    }
    check("E-30", "Schmale Fenster (900, 700 und 560 Pixel Breite): alle Schaltflächen der Werkzeugleiste liegen im Graphbereich, überlappen nicht und lassen sich bedienen; der Export funktioniert",
      Object.values(narrow).every(state => state.inside && !state.overlapping && state.exported),
      Object.entries(narrow).map(([width, state]) => `${width}px: ${state.rows} Zeilen, Leiste ${state.barHeight}px von ${state.section}px`).join("; "));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(150);

    // --- Während einer Berechnung gesperrt ----------------------------------------------
    await page.route("**/api/sessions/*", async route => {
      if (route.request().method() === "PATCH") await new Promise(resolve => setTimeout(resolve, 900));
      await route.continue();
    });
    await page.getByRole("button", { name: "Alle Kanten wiederherstellen" }).click();
    await page.waitForTimeout(250);
    const lockedWhileLoading = await exportButton("svg").isDisabled() && await exportButton("png").isDisabled();
    await settle();
    await page.unroute("**/api/sessions/*");
    check("E-31", "Während einer Berechnung sind die Export-Schaltflächen gesperrt, danach wieder bedienbar",
      lockedWhileLoading && await exportButton("svg").isEnabled());

    check("E-32", "Keine unerwarteten Konsolenfehler", consoleErrors.length === 0, consoleErrors[0] ?? "");
    fs.rmSync(workDirectory, { recursive: true, force: true });
  },
};
