// Reine Hilfsfunktionen für den Bildexport der Graphansicht (SVG und PNG).
// Sie greifen weder auf das DOM noch auf den Browser zu und lassen sich daher
// mit `node --test` prüfen. Das Auslesen der Zeichnung und das Erzeugen des PNG
// stehen in graphImageExport.js.

// Schriftfamilie des Bildes. Sie steht im SVG selbst, weil eine eigenständig
// geöffnete Datei die Schrift der Oberfläche nicht erbt.
export const EXPORT_FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Farben des Bildrahmens. Die Farben der Routen, Ausfälle und Knoten stammen aus
// der Zeichnung selbst und aus der Legende; hier stehen nur Hintergrund und Text.
// Der Hintergrund ist der der Graphfläche (`panel` in App.jsx).
const BACKGROUND = "#131720";
const SEPARATOR = "#252b3b";
const TEXT = "#e2e8f4";
const LABEL = "#64708a";
const LEGEND_TEXT = "#9aa5bb";

export const PNG_MIN_WIDTH = 1600;
const PNG_MAX_SIDE = 8192;
const PNG_MAX_PIXELS = 48_000_000;

// Maße des Bildes in Zeichnungseinheiten (eine Einheit entspricht im SVG einem
// Pixel).
export const IMAGE_LAYOUT = {
  minWidth: 880,
  paddingX: 24,
  graphPadding: 28,
  minGraphHeight: 180,
  titleBaseline: 30,
  metricsTop: 46,
  metricRowHeight: 36,
  metricGap: 30,
  headerBottom: 6,
  legendTop: 14,
  legendRowHeight: 22,
  legendBottom: 8,
  legendGap: 18,
  glyphWidth: 26,
  glyphGap: 6,
};

const round = value => Math.round(value * 100) / 100;

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Entfernt Zeichen, die in XML 1.0 nicht vorkommen dürfen (Steuerzeichen,
// einzelne Surrogate). Ein Knotenname aus einer importierten Datei könnte sie
// enthalten; das SVG wäre sonst kein gültiges XML mehr.
export function sanitizeXmlText(value) {
  let result = "";
  for (const char of String(value ?? "")) {
    const code = char.codePointAt(0);
    const valid = code === 0x9 || code === 0xA || code === 0xD
      || (code >= 0x20 && code <= 0xD7FF)
      || (code >= 0xE000 && code <= 0xFFFD)
      || (code >= 0x10000 && code <= 0x10FFFF);
    if (valid) result += char;
  }
  return result;
}

const xmlText = value => escapeXml(sanitizeXmlText(value));

// Dateiname eines exportierten Bildes, z. B.
// "graph-germany50-20261126-0915.svg".
export function graphImageFileName(topologyName, extension, date = new Date()) {
  const slug = String(topologyName ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
  const pad = value => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
    + `-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `graph-${slug || "topologie"}-${stamp}.${extension}`;
}

// Kürzt einen Text auf eine Breite; `measure(text)` liefert die Breite.
export function truncateToWidth(text, maxWidth, measure) {
  const value = String(text);
  if (measure(value) <= maxWidth) return value;
  let end = value.length;
  while (end > 0 && measure(`${value.slice(0, end)}…`) > maxWidth) end -= 1;
  return `${value.slice(0, end).trimEnd()}…`;
}

// Ordnet Elemente der Reihe nach in Zeilen an, die höchstens `maxWidth` breit
// sind. Ein einzelnes Element, das breiter ist, steht allein in seiner Zeile.
export function flowLayout(widths, maxWidth, gap) {
  const positions = [];
  let x = 0;
  let row = 0;
  widths.forEach(width => {
    if (x > 0 && x + width > maxWidth) {
      row += 1;
      x = 0;
    }
    positions.push({ x, row });
    x += width + gap;
  });
  return { positions, rows: widths.length ? row + 1 : 0 };
}

// Vergrößerung für das PNG: mindestens zweifach und mindestens 1600 Pixel
// breit, aber begrenzt, damit die Zeichenfläche des Browsers nicht überläuft.
export function pngScale(width, height) {
  const wanted = Math.max(2, PNG_MIN_WIDTH / width);
  const bySide = PNG_MAX_SIDE / Math.max(width, height);
  const byPixels = Math.sqrt(PNG_MAX_PIXELS / (width * height));
  return Math.min(wanted, bySide, byPixels);
}

// Kopfzeile des Bildes: Topologie, Zielknoten, Routingverfahren und Zahl der
// Ausfälle; bei Bonsai zusätzlich die angezeigte Aboreszenz und, wenn nicht alle
// Routen zu sehen sind, die gewählte Routenanzeige.
export function exportHeaderItems(details, colors) {
  const strategy = details.strategy === "bonsai_greedy"
    ? "Bonsai (Greedy)"
    : `Kürzester Pfad (${details.weightMode === "edge_weight" ? "Kantengewicht" : "Hop-Anzahl"})`;
  const items = [
    { label: "Topologie", value: details.topologyName, color: colors.topology },
    { label: "Zielknoten", value: details.targetLabel, color: colors.target },
    { label: "Routingverfahren", value: strategy, color: colors.strategy },
    {
      label: "Ausfälle",
      value: String(details.failureCount),
      color: details.failureCount ? colors.failure : colors.ok,
    },
  ];
  if (details.treeId) items.push({ label: "Aboreszenz", value: details.treeId, color: colors.strategy });
  if (details.routeDisplay) items.push({ label: "Routenanzeige", value: details.routeDisplay, color: colors.muted });
  return items;
}

// Legendensymbole als Vektorformen. Die Oberfläche zeigt Schriftzeichen
// (━ ✕ ●); in einer eigenständigen Datei wären sie nicht überall vorhanden.
function legendGlyph(kind, color, x, y) {
  const c = xmlText(color);
  const [left, centre, right] = [round(x), round(x + 12), round(x + 24)];
  if (kind === "failed") {
    return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${c}" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round"/>`
      + `<circle cx="${centre}" cy="${y}" r="5.5" fill="${BACKGROUND}" stroke="${c}" stroke-width="1.6"/>`
      + `<path d="M${round(x + 9.5)} ${y - 2.5}L${round(x + 14.5)} ${y + 2.5}M${round(x + 14.5)} ${y - 2.5}L${round(x + 9.5)} ${y + 2.5}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  if (kind === "dot") {
    return `<circle cx="${centre}" cy="${y}" r="5" fill="${c}"/>`;
  }
  if (kind === "arrow") {
    return `<line x1="${left}" y1="${y}" x2="${round(x + 18)}" y2="${y}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M${round(x + 15)} ${y - 5.5}L${round(x + 25.5)} ${y}L${round(x + 15)} ${y + 5.5}Z" fill="${c}"/>`;
  }
  return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`;
}

// Setzt das Bild zusammen: Kopfzeile, die ausgelesene Zeichnung und die Legende
// auf dem Hintergrund der Graphfläche.
//
//   scene       { markup, defs, bounds: { x, y, width, height } }: die bereits
//               bereinigte Zeichnung als SVG-Text mit ihrem Umriss in Zeichnungs-
//               koordinaten
//   headerItems [{ label, value, color }]
//   legendItems [{ kind, color, label }]
//   measure     (Text, Schriftgröße, Schriftstärke) → Breite in Einheiten
//
// Ergebnis: { svg, width, height } mit ganzzahliger Größe.
export function composeGraphImage({ scene, headerItems, legendItems, measure }) {
  const layout = IMAGE_LAYOUT;
  const { bounds } = scene;
  const width = Math.max(layout.minWidth, Math.ceil(bounds.width + 2 * layout.graphPadding));
  const contentWidth = width - 2 * layout.paddingX;

  // Kopfzeile
  const blocks = headerItems.map(item => {
    const labelText = item.label.toUpperCase();
    const labelWidth = measure(labelText, 9, 400) + labelText.length * 0.72;
    const valueText = truncateToWidth(sanitizeXmlText(item.value), contentWidth, text => measure(text, 12.5, 800));
    return { item, labelText, valueText, width: Math.max(labelWidth, measure(valueText, 12.5, 800)) };
  });
  const header = flowLayout(blocks.map(block => block.width), contentWidth, layout.metricGap);
  const headerHeight = layout.metricsTop + header.rows * layout.metricRowHeight + layout.headerBottom;

  // Zeichnung
  const graphHeight = Math.max(layout.minGraphHeight, Math.ceil(bounds.height + 2 * layout.graphPadding));
  const graphTop = headerHeight;

  // Legende
  const legendEntries = [
    { title: true, width: measure("Legende", 10.5, 800) },
    ...legendItems.map(item => ({
      item,
      width: layout.glyphWidth + layout.glyphGap + measure(item.label, 10.5, 400),
    })),
  ];
  const legend = flowLayout(legendEntries.map(entry => entry.width), contentWidth, layout.legendGap);
  const legendTop = graphTop + graphHeight;
  const legendHeight = layout.legendTop + legend.rows * layout.legendRowHeight + layout.legendBottom;
  const height = Math.ceil(legendTop + legendHeight);

  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`
    + ` font-family="${EXPORT_FONT_FAMILY}" role="img" aria-labelledby="graph-title graph-desc">`,
  );
  parts.push('<title id="graph-title">Failover Routing Visualizer</title>');
  parts.push(`<desc id="graph-desc">${xmlText(headerItems.map(item => `${item.label}: ${item.value}`).join(", "))}</desc>`);
  parts.push(scene.defs);
  parts.push(`<rect width="${width}" height="${height}" fill="${BACKGROUND}"/>`);

  parts.push(`<text x="${layout.paddingX}" y="${layout.titleBaseline}" fill="${TEXT}" font-size="15" font-weight="800">Failover Routing Visualizer</text>`);
  blocks.forEach((block, index) => {
    const { x, row } = header.positions[index];
    const left = round(layout.paddingX + x);
    const top = layout.metricsTop + row * layout.metricRowHeight;
    parts.push(
      `<text x="${left}" y="${top + 9}" fill="${LABEL}" font-size="9" letter-spacing=".08em">${xmlText(block.labelText)}</text>`
      + `<text x="${left}" y="${top + 25}" fill="${xmlText(block.item.color)}" font-size="12.5" font-weight="800">${xmlText(block.valueText)}</text>`,
    );
  });
  parts.push(`<line x1="0" y1="${graphTop - 0.5}" x2="${width}" y2="${graphTop - 0.5}" stroke="${SEPARATOR}"/>`);

  const offsetX = (width - bounds.width) / 2 - bounds.x;
  const offsetY = graphTop + (graphHeight - bounds.height) / 2 - bounds.y;
  parts.push(`<g transform="translate(${round(offsetX)} ${round(offsetY)})">${scene.markup}</g>`);

  parts.push(`<line x1="0" y1="${legendTop - 0.5}" x2="${width}" y2="${legendTop - 0.5}" stroke="${SEPARATOR}"/>`);
  legendEntries.forEach((entry, index) => {
    const { x, row } = legend.positions[index];
    const left = round(layout.paddingX + x);
    const centre = legendTop + layout.legendTop + row * layout.legendRowHeight + 8;
    if (entry.title) {
      parts.push(`<text x="${left}" y="${centre + 3.7}" fill="${TEXT}" font-size="10.5" font-weight="800">Legende</text>`);
      return;
    }
    parts.push(
      legendGlyph(entry.item.kind, entry.item.color, left, centre)
      + `<text x="${round(left + layout.glyphWidth + layout.glyphGap)}" y="${centre + 3.7}" fill="${LEGEND_TEXT}" font-size="10.5">${xmlText(entry.item.label)}</text>`,
    );
  });
  parts.push("</svg>");
  return { svg: parts.join("\n"), width, height };
}
