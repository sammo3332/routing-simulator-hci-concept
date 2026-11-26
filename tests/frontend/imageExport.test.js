import assert from "node:assert/strict";
import test from "node:test";
import { graphLegendItems } from "../../src/utils/graphLegend.js";
import {
  composeGraphImage,
  escapeXml,
  exportHeaderItems,
  flowLayout,
  graphImageFileName,
  IMAGE_LAYOUT,
  pngScale,
  sanitizeXmlText,
  truncateToWidth,
} from "../../src/utils/imageExport.js";

const date = new Date(2026, 10, 26, 9, 5);
const colors = { T1: "#39ff14", T2: "#c084fc", RED: "#ff4040", GOLD: "#fbbf24", EDGE_IDLE: "#64708a" };
const headerColors = { topology: "#60a5fa", target: "#fbbf24", strategy: "#a78bfa", failure: "#ff4040", ok: "#22c55e", muted: "#9aa5bb" };
// Feste Breite je Zeichen genügt, um die Anordnung zu prüfen.
const measure = (text, size = 10) => String(text).length * size * 0.55;

test("file name contains topology name and local timestamp", () => {
  assert.equal(graphImageFileName("germany50", "svg", date), "graph-germany50-20261126-0905.svg");
  assert.equal(graphImageFileName("germany50", "png", date), "graph-germany50-20261126-0905.png");
});

test("file name is safe for unusual topology names", () => {
  assert.equal(
    graphImageFileName("Köln / Düsseldorf: Test*?", "svg", date),
    "graph-koln-dusseldorf-test-20261126-0905.svg",
  );
  assert.equal(graphImageFileName("", "png", date), "graph-topologie-20261126-0905.png");
  assert.equal(graphImageFileName(undefined, "png", date), "graph-topologie-20261126-0905.png");
  assert.ok(graphImageFileName("x".repeat(200), "svg", date).length < 70);
});

test("xml escaping covers markup characters", () => {
  assert.equal(escapeXml(`a & b < c > "d" 'e'`), "a &amp; b &lt; c &gt; &quot;d&quot; &#39;e&#39;");
});

test("characters that are invalid in XML 1.0 are removed", () => {
  assert.equal(sanitizeXmlText("A\u0000B\u0001C\u0008D"), "ABCD");
  assert.equal(sanitizeXmlText("zeile\nzwei\tdrei\r"), "zeile\nzwei\tdrei\r");
  assert.equal(sanitizeXmlText("a￾b￿c"), "abc");
  // Ein einzelnes Surrogat ist ungültig, ein vollständiges Paar (Emoji) nicht.
  assert.equal(sanitizeXmlText("x\uD800y"), "xy");
  assert.equal(sanitizeXmlText("x\uDC00y"), "xy");
  assert.equal(sanitizeXmlText("Netz 🕸 Köln"), "Netz 🕸 Köln");
  assert.equal(sanitizeXmlText(undefined), "");
});

test("long texts are shortened to the available width", () => {
  const width = text => text.length * 10;
  assert.equal(truncateToWidth("kurz", 100, width), "kurz");
  const shortened = truncateToWidth("ein sehr langer Name", 100, width);
  assert.ok(shortened.endsWith("…"));
  assert.ok(width(shortened) <= 100);
  assert.equal(truncateToWidth("abc", 5, width), "…");
});

test("items flow into rows that stay within the width", () => {
  const { positions, rows } = flowLayout([100, 100, 100, 100], 250, 10);
  assert.equal(rows, 2);
  assert.deepEqual(positions.map(item => item.row), [0, 0, 1, 1]);
  assert.deepEqual(positions.map(item => item.x), [0, 110, 0, 110]);
  assert.deepEqual(flowLayout([], 250, 10), { positions: [], rows: 0 });
  // Ein zu breites Element steht allein in seiner Zeile.
  assert.deepEqual(flowLayout([400, 50], 250, 10).positions.map(item => item.row), [0, 1]);
});

test("PNG is at least 1600 pixels wide and stays within browser limits", () => {
  assert.ok(880 * pngScale(880, 552) >= 1600);
  assert.equal(pngScale(1200, 700), 2);
  assert.ok(500 * pngScale(500, 300) >= 1600);
  const huge = pngScale(20000, 12000);
  assert.ok(20000 * huge <= 8192 + 0.001);
  assert.ok(20000 * 12000 * huge * huge <= 48_000_000 + 1);
});

test("legend lists the same entries as the interface, Bonsai adds the arborescence", () => {
  const plain = graphLegendItems(colors, false);
  assert.deepEqual(plain.map(item => item.label), [
    "Route vor dem Ausfall", "Aktuelle Route", "Kante ohne Route", "Ausgefallene Kante",
    "Umgeleiteter Knoten", "Unerreichbarer Knoten", "Zielknoten",
  ]);
  assert.deepEqual(plain.map(item => item.color), [
    colors.T2, colors.T1, colors.EDGE_IDLE, colors.RED, colors.T2, colors.RED, colors.GOLD,
  ]);
  const bonsai = graphLegendItems(colors, true);
  assert.equal(bonsai.length, plain.length + 1);
  assert.equal(bonsai.at(-1).label, "Gewählte Aboreszenz");
  assert.ok(bonsai.every(item => item.glyph && ["line", "failed", "dot", "arrow"].includes(item.kind)));
});

test("header names topology, target, method and failures; Bonsai adds the tree", () => {
  const shortest = exportHeaderItems({
    topologyName: "germany50", targetLabel: "Berlin (A)", strategy: "deterministic_shortest_path",
    weightMode: "edge_weight", failureCount: 2, treeId: "", routeDisplay: "",
  }, headerColors);
  assert.deepEqual(shortest.map(item => [item.label, item.value]), [
    ["Topologie", "germany50"], ["Zielknoten", "Berlin (A)"],
    ["Routingverfahren", "Kürzester Pfad (Kantengewicht)"], ["Ausfälle", "2"],
  ]);
  assert.equal(shortest[3].color, headerColors.failure);
  const bonsai = exportHeaderItems({
    topologyName: "x", targetLabel: "T", strategy: "bonsai_greedy", weightMode: "hop_count",
    failureCount: 0, treeId: "T2", routeDisplay: "Route von C",
  }, headerColors);
  assert.deepEqual(bonsai.map(item => [item.label, item.value]).slice(2), [
    ["Routingverfahren", "Bonsai (Greedy)"], ["Ausfälle", "0"], ["Aboreszenz", "T2"], ["Routenanzeige", "Route von C"],
  ]);
  assert.equal(bonsai[3].color, headerColors.ok);
});

const scene = {
  markup: '<g xmlns="http://www.w3.org/2000/svg" data-graph-scene="true"><circle cx="50" cy="40" r="16"/></g>',
  defs: '<defs xmlns="http://www.w3.org/2000/svg"><marker id="tree-arrow"/></defs>',
  bounds: { x: 20, y: 10, width: 300, height: 200 },
};
const headerItems = exportHeaderItems({
  topologyName: "Netz <A> & B", targetLabel: "A", strategy: "bonsai_greedy", weightMode: "hop_count",
  failureCount: 1, treeId: "T1", routeDisplay: "",
}, headerColors);

test("composed image has the declared size and a self-contained structure", () => {
  const legendItems = graphLegendItems(colors, true);
  const { svg, width, height } = composeGraphImage({ scene, headerItems, legendItems, measure });
  assert.equal(width, IMAGE_LAYOUT.minWidth);
  assert.ok(Number.isInteger(height) && height > IMAGE_LAYOUT.minGraphHeight);
  assert.ok(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes(`width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`));
  assert.ok(svg.trimEnd().endsWith("</svg>"));
  assert.ok(svg.includes(scene.markup) && svg.includes(scene.defs));
  // Dunkler Hintergrund über die ganze Fläche.
  assert.ok(svg.includes(`<rect width="${width}" height="${height}" fill="#131720"/>`));
  // Alle Legendeneinträge stehen im Bild.
  legendItems.forEach(item => assert.ok(svg.includes(`>${item.label}</text>`), item.label));
  assert.ok(svg.includes(">Legende</text>"));
  // Der Name der Topologie ist maskiert.
  assert.ok(svg.includes("Netz &lt;A&gt; &amp; B"));
  assert.ok(!svg.includes("Netz <A>"));
});

test("composed image has no external references and no script", () => {
  const { svg } = composeGraphImage({ scene, headerItems, legendItems: graphLegendItems(colors, true), measure });
  assert.deepEqual(svg.match(/https?:\/\/[^"'\s<>]+/g), [
    "http://www.w3.org/2000/svg", "http://www.w3.org/2000/svg", "http://www.w3.org/2000/svg",
  ]);
  assert.ok(!/<(image|use|script|foreignObject|style|a)[\s>]/.test(svg));
  assert.ok(!/(xlink:)?href=/.test(svg));
  assert.ok(!/@import|url\((?!#)/.test(svg));
});

test("the drawing is centred between header and legend and kept inside the image", () => {
  const { svg, width, height } = composeGraphImage({
    scene, headerItems, legendItems: graphLegendItems(colors, false), measure,
  });
  const [, offsetX, offsetY] = svg.match(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)">/).map(Number);
  const left = scene.bounds.x + offsetX;
  const right = left + scene.bounds.width;
  const top = scene.bounds.y + offsetY;
  const bottom = top + scene.bounds.height;
  assert.ok(left >= IMAGE_LAYOUT.graphPadding && right <= width - IMAGE_LAYOUT.graphPadding);
  assert.ok(Math.abs(left - (width - right)) < 0.01);
  assert.ok(top >= IMAGE_LAYOUT.metricsTop && bottom <= height - IMAGE_LAYOUT.legendTop);
});

test("a wide topology widens the image instead of being cut off", () => {
  const wide = { ...scene, bounds: { x: 0, y: 0, width: 1500, height: 400 } };
  const { width } = composeGraphImage({ scene: wide, headerItems, legendItems: graphLegendItems(colors, false), measure });
  assert.equal(width, 1500 + 2 * IMAGE_LAYOUT.graphPadding);
});

test("invalid characters in names do not reach the image", () => {
  const items = exportHeaderItems({
    topologyName: "Kn\u0001oten\uD800", targetLabel: "A", strategy: "bonsai_greedy",
    weightMode: "hop_count", failureCount: 0, treeId: "", routeDisplay: "",
  }, headerColors);
  const { svg } = composeGraphImage({ scene, headerItems: items, legendItems: [], measure });
  assert.ok(svg.includes(">Knoten</text>"));
  // Enthielte das Bild noch ungültige Zeichen, würde die Bereinigung etwas entfernen.
  assert.equal(sanitizeXmlText(svg), svg);
});

test("a long topology name is shortened instead of overflowing the header", () => {
  const items = exportHeaderItems({
    topologyName: "N".repeat(400), targetLabel: "A", strategy: "bonsai_greedy",
    weightMode: "hop_count", failureCount: 0, treeId: "", routeDisplay: "",
  }, headerColors);
  const { svg } = composeGraphImage({ scene, headerItems: items, legendItems: [], measure });
  const name = svg.match(/font-size="12\.5" font-weight="800">(N+…)<\/text>/);
  assert.ok(name, "Name wurde nicht gekürzt");
  assert.ok(measure(name[1], 12.5) <= IMAGE_LAYOUT.minWidth - 2 * IMAGE_LAYOUT.paddingX);
});
