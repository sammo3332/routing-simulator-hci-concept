import assert from "node:assert/strict";
import test from "node:test";
import {
  clampGraphScale,
  fitViewportToNodes,
  initialGraphViewport,
  panViewport,
  zoomViewportAtPoint,
} from "../../src/utils/graphViewport.js";

const closeTo = (actual, expected) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
};

test("zoom is clamped to the supported range", () => {
  assert.equal(clampGraphScale(0.1), 0.5);
  assert.equal(clampGraphScale(2), 2);
  assert.equal(clampGraphScale(12), 6);
});

test("zoom keeps the graph coordinate below the pointer stable", () => {
  const viewport = { x: 30, y: -20, scale: 1.5 };
  const point = { x: 240, y: 160 };
  const graphXBefore = (point.x - viewport.x) / viewport.scale;
  const graphYBefore = (point.y - viewport.y) / viewport.scale;

  const zoomed = zoomViewportAtPoint(viewport, point, 1.25);

  closeTo((point.x - zoomed.x) / zoomed.scale, graphXBefore);
  closeTo((point.y - zoomed.y) / zoomed.scale, graphYBefore);
});

test("opposite zoom steps return to the initial viewport", () => {
  const initial = initialGraphViewport();
  const point = { x: 400, y: 205 };
  const zoomed = zoomViewportAtPoint(initial, point, 1.25);
  const restored = zoomViewportAtPoint(zoomed, point, 1 / 1.25);

  closeTo(restored.x, initial.x);
  closeTo(restored.y, initial.y);
  closeTo(restored.scale, initial.scale);
});

test("panning changes only the translation", () => {
  assert.deepEqual(
    panViewport({ x: 10, y: 20, scale: 2 }, -4, 7),
    { x: 6, y: 27, scale: 2 },
  );
});

test("fit centers every node inside the padded viewport", () => {
  const nodes = [
    { position: { x: 100, y: 80 } },
    { position: { x: 700, y: 330 } },
    { position: { x: 350, y: 200 } },
  ];
  const fitted = fitViewportToNodes(nodes, 800, 410, { padding: 40 });

  for (const node of nodes) {
    const screenX = fitted.x + node.position.x * fitted.scale;
    const screenY = fitted.y + node.position.y * fitted.scale;
    assert.ok(screenX >= 40 && screenX <= 760);
    assert.ok(screenY >= 40 && screenY <= 370);
  }
});

test("fit handles an empty topology safely", () => {
  assert.deepEqual(fitViewportToNodes([], 800, 410), initialGraphViewport());
});
