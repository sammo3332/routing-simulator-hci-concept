// Bildexport der Graphansicht als SVG oder PNG.
//
// Es gibt keine zweite Graphzeichnung: Der Export kopiert die Zeichnung, die die
// Oberfläche gerade zeigt, entfernt alles, was nur der Bedienung dient, und
// setzt Kopfzeile und Legende davor und darunter. Routen, Ausfälle, Knoten und
// Pfeile stammen damit aus derselben Berechnung und demselben Zeichencode wie
// die Ansicht. Der Export liest nur; Zustand, Ansicht und Backend bleiben
// unberührt.
import {
  composeGraphImage,
  EXPORT_FONT_FAMILY,
  graphImageFileName,
  pngScale,
  sanitizeXmlText,
  shortenLabel,
} from "./imageExport";

const SVG_NS = "http://www.w3.org/2000/svg";

// Attribute, die nur die Bedienung betreffen oder die der Export selbst setzt.
const INTERACTION_ATTRIBUTES = [
  "style", "role", "tabindex", "aria-label", "aria-hidden", "pointer-events",
  "vector-effect", "data-export", "data-export-stroke-width",
];

let measuringContext;
function measureText(text, size, weight) {
  measuringContext ??= document.createElement("canvas").getContext("2d");
  measuringContext.font = `${weight} ${size}px ${EXPORT_FONT_FAMILY}`;
  return measuringContext.measureText(text).width;
}

// Kopiert die Zeichnung aus der Ansicht und bereitet sie für den Export auf.
// Die Ansicht selbst wird nicht verändert. `showAllNodeNames` ist die Option
// „Namen“: Die Namen im Bild richten sich nach ihr und nicht danach, wie stark
// gerade gezoomt ist (die Ansicht blendet ab 125 % alle Namen ein).
export function readGraphScene(svgElement, { showAllNodeNames }) {
  const scene = svgElement?.querySelector("g[data-graph-scene]");
  if (!scene) throw new Error("Die Graphzeichnung wurde nicht gefunden.");
  const clone = scene.cloneNode(true);
  // Zoom und Verschiebung gehören zur Ansicht, nicht zum Bild.
  clone.removeAttribute("transform");
  clone.querySelectorAll('[data-export="skip"]').forEach(node => node.remove());
  if (!showAllNodeNames) {
    clone.querySelectorAll('[data-export="label-optional"]').forEach(node => node.remove());
  }
  // Die Ansicht hebt die zuletzt gewählte Kante durch eine dickere Linie hervor;
  // im Bild gilt die Breite, die die Kante ohne diese Auswahl hätte.
  clone.querySelectorAll("[data-export-stroke-width]").forEach(node => {
    node.setAttribute("stroke-width", node.getAttribute("data-export-stroke-width"));
  });
  [clone, ...clone.querySelectorAll("*")].forEach(node => {
    INTERACTION_ATTRIBUTES.forEach(name => node.removeAttribute(name));
  });
  // Überlange Namen werden gekürzt, damit sie das Bild nicht beliebig verbreitern.
  clone.querySelectorAll("text").forEach(node => {
    const shortened = shortenLabel(node.textContent);
    if (shortened !== node.textContent) node.textContent = shortened;
  });

  const defs = svgElement.querySelector(":scope > defs")?.cloneNode(true);
  const bounds = measureBounds(clone, defs);
  const serializer = new XMLSerializer();
  return {
    markup: sanitizeXmlText(serializer.serializeToString(clone)),
    defs: defs ? sanitizeXmlText(serializer.serializeToString(defs)) : "",
    bounds,
  };
}

// Umriss der Zeichnung in Graphkoordinaten, einschließlich der Namen. Dafür muss
// die Kopie kurz im Dokument liegen; sie ist unsichtbar, außerhalb des Fensters
// und wird sofort wieder entfernt.
function measureBounds(sceneClone, defs) {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-100000px;top:0;width:10px;height:10px;overflow:hidden;opacity:0;pointer-events:none";
  const measuring = document.createElementNS(SVG_NS, "svg");
  measuring.setAttribute("width", "10");
  measuring.setAttribute("height", "10");
  measuring.setAttribute("font-family", EXPORT_FONT_FAMILY);
  if (defs) measuring.appendChild(defs.cloneNode(true));
  measuring.appendChild(sceneClone);
  host.appendChild(measuring);
  document.body.appendChild(host);
  try {
    const box = sceneClone.getBBox();
    if (![box.x, box.y, box.width, box.height].every(Number.isFinite)) {
      throw new Error("Der Umriss der Graphzeichnung ist nicht bestimmbar.");
    }
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  } finally {
    // Die Kopie bleibt für die Serialisierung erhalten, nur der Rahmen geht.
    measuring.removeChild(sceneClone);
    host.remove();
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Das SVG-Bild konnte nicht in ein PNG umgewandelt werden."));
    image.src = url;
  });
}

async function svgToPng(svg, width, height) {
  const scale = pngScale(width, height);
  const pixelWidth = Math.round(width * scale);
  const pixelHeight = Math.round(height * scale);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.getContext("2d").drawImage(image, 0, 0, pixelWidth, pixelHeight);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Der Browser konnte das PNG nicht erzeugen.");
    return { blob, pixelWidth, pixelHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Erzeugt das Bild der gesamten Topologie, unabhängig von Zoom und Ausschnitt.
// `headerItems` und `legendItems` kommen aus der Oberfläche (siehe
// exportHeaderItems und graphLegendItems).
export async function createGraphImage({
  format, svgElement, showAllNodeNames, topologyName, headerItems, legendItems, date,
}) {
  const scene = readGraphScene(svgElement, { showAllNodeNames });
  const { svg, width, height } = composeGraphImage({ scene, headerItems, legendItems, measure: measureText });
  const fileName = graphImageFileName(topologyName, format, date);
  if (format === "svg") {
    return { blob: new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), fileName, width, height };
  }
  const png = await svgToPng(svg, width, height);
  return { ...png, fileName, width, height };
}

// Stößt den Download an. Ob die Datei danach auf dem Datenträger liegt,
// entscheidet der Browser oder im Windows-Programm der Speichern-Dialog.
export function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
