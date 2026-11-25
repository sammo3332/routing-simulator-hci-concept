const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const FIXTURES = {
  small: path.join(ROOT, "tests/fixtures/bonsai_routing_failure.json"),
  other: path.join(ROOT, "tests/fixtures/topohub_mini.json"),
  large: path.join(ROOT, "tests/fixtures/synthetic_50_nodes.json"),
};
const PANEL_BACKGROUND = [0x13, 0x17, 0x20];

function luminance([red, green, blue]) {
  const [r, g, b] = [red, green, blue].map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const [high, low] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

const near = (left, right, tolerance = 1.5) => Math.abs(left - right) <= tolerance;

function createContext({ page, baseUrl, shotDir, results }) {
  const consoleErrors = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", error => consoleErrors.push(`Seitenfehler: ${error.message}`));
  const apiRequests = [];
  page.on("request", request => {
    if (request.url().includes("/api/")) apiRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });

  const check = (id, description, passed, detail = "") => {
    results.push({ id, description, passed: Boolean(passed), detail });
    console.log(`${passed ? "bestanden      " : "NICHT bestanden"} | ${id} | ${description}${detail ? ` | ${detail}` : ""}`);
  };
  // Wartet, bis keine Berechnung mehr läuft.
  const settle = async () => {
    await page.waitForTimeout(120);
    await page.getByText("Bereit", { exact: true }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(80);
  };
  const topologyInput = page.locator('input[type="file"][accept*=".graphml"]');
  const upload = async file => { await topologyInput.setInputFiles(file); await settle(); };
  const shot = async (name, locator) => {
    if (!shotDir) return;
    await (locator ?? page).screenshot({ path: path.join(shotDir, name) });
  };
  const graph = page.locator('svg[aria-label^="Netzwerkgraph"]');
  const graphSection = page.locator("main > section").first();
  const nodeCircle = id => page.locator(`[data-graph-node-id="${id}"] circle[r="16"]`);
  const graphPosition = id => nodeCircle(id).evaluate(circle => ({
    x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")),
  }));
  const screenCenter = async id => {
    const box = await nodeCircle(id).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const dragNode = async (id, deltaX, deltaY, { release = true } = {}) => {
    const start = await screenCenter(id);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + deltaX, start.y + deltaY, { steps: 6 });
    if (release) { await page.mouse.up(); await page.waitForTimeout(120); }
    return { x: start.x + deltaX, y: start.y + deltaY };
  };
  const edge = (source, target) => page.locator(`g[role="button"][aria-label="Kante ${source} nach ${target} auswählen"]`);
  const edgeGeometry = (source, target) => edge(source, target).evaluate(group => {
    const line = group.querySelector("line");
    const marker = group.querySelector("circle");
    return {
      x1: Number(line.getAttribute("x1")), y1: Number(line.getAttribute("y1")),
      x2: Number(line.getAttribute("x2")), y2: Number(line.getAttribute("y2")),
      marker: marker ? { x: Number(marker.getAttribute("cx")), y: Number(marker.getAttribute("cy")) } : null,
    };
  });
  // Farbe und Deckkraft der sichtbaren Grundlinie einer Kante.
  const edgeStroke = (source, target) => edge(source, target).evaluate(group => {
    const line = [...group.querySelectorAll("line")].find(item => getComputedStyle(item).stroke !== "rgba(0, 0, 0, 0)"
      && item.getAttribute("stroke") !== "transparent" && !item.getAttribute("marker-end"));
    const style = getComputedStyle(line);
    return { stroke: style.stroke, opacity: Number(style.opacity), dash: style.strokeDasharray };
  });
  const clickEdge = async (source, target) => {
    const box = await edge(source, target).locator("line").first().boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await settle();
  };
  const activeFailures = () => page.locator("text=/Aktive Ausfälle/").first().innerText();
  const select = label => page.locator("aside select").nth(
    ["Zielknoten", "Routingmetrik", "Route hervorheben"].indexOf(label),
  );
  const choose = async (label, value) => { await select(label).selectOption(value); await settle(); };
  const strategy = async name => { await page.getByRole("button", { name }).click(); await settle(); };
  const openDetails = async () => {
    const button = page.getByRole("button", { name: /Aufklappen/ });
    if (await button.count()) await button.click();
  };
  const routeTable = async () => {
    await openDetails();
    return page.locator("#routing-detail-panels table tbody").innerText();
  };

  return {
    page, baseUrl, check, settle, upload, shot, graph, graphSection, nodeCircle, graphPosition,
    screenCenter, dragNode, edge, edgeGeometry, edgeStroke, clickEdge, activeFailures, select,
    choose, strategy, openDetails, routeTable, consoleErrors, apiRequests, near, contrast,
    FIXTURES, PANEL_BACKGROUND, ROOT,
  };
}

module.exports = { createContext, contrast, near, FIXTURES };
