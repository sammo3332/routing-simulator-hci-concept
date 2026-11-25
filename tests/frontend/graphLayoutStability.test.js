import assert from "node:assert/strict";
import test from "node:test";
import {
  clampPointToRect, placeNodeTooltip, shortenSegmentEnd, visibleGraphBounds,
} from "../../src/utils/graphLayout.js";

const rect = { left: 300, top: 150, right: 1400, bottom: 830 };

test("pointer inside the graph area is not changed", () => {
  assert.deepEqual(clampPointToRect({ x: 500, y: 400 }, rect, 14), { x: 500, y: 400 });
});

test("pointer outside the graph area is held at its edge", () => {
  assert.deepEqual(clampPointToRect({ x: 100, y: 900 }, rect, 14), { x: 314, y: 816 });
  assert.deepEqual(clampPointToRect({ x: 2000, y: -5 }, rect, 14), { x: 1386, y: 164 });
});

test("a graph area smaller than the margin keeps the pointer centred", () => {
  const tiny = { left: 0, top: 0, right: 20, bottom: 20 };
  assert.deepEqual(clampPointToRect({ x: 90, y: -90 }, tiny, 14), { x: 10, y: 10 });
});

test("arrow ends at the node edge and keeps its direction", () => {
  const end = shortenSegmentEnd({ x: 0, y: 0 }, { x: 100, y: 0 }, 19);
  assert.deepEqual(end, { x: 81, y: 0 });
  const diagonal = shortenSegmentEnd({ x: 0, y: 0 }, { x: 30, y: 40 }, 10);
  assert.ok(Math.abs(diagonal.x - 24) < 1e-9 && Math.abs(diagonal.y - 32) < 1e-9);
});

test("arrow between overlapping nodes ends between them", () => {
  assert.deepEqual(shortenSegmentEnd({ x: 0, y: 0 }, { x: 20, y: 0 }, 19), { x: 10, y: 0 });
  assert.deepEqual(shortenSegmentEnd({ x: 5, y: 5 }, { x: 5, y: 5 }, 19), { x: 5, y: 5 });
});

test("visible bounds follow zoom and pan", () => {
  assert.deepEqual(
    visibleGraphBounds({ x: 0, y: 0, scale: 1 }, 800, 410),
    { left: 0, top: 0, right: 800, bottom: 410 },
  );
  assert.deepEqual(
    visibleGraphBounds({ x: 200, y: 100, scale: 0.5 }, 800, 410),
    { left: -400, top: -200, right: 1200, bottom: 620 },
  );
});

test("tooltip stays at a node that lies outside the original drawing area", () => {
  const bounds = visibleGraphBounds({ x: 200, y: 100, scale: 0.5 }, 800, 410);
  const placed = placeNodeTooltip({ x: -181, y: 300 }, { width: 72, height: 25 }, bounds);
  assert.deepEqual(placed, { x: -217, y: 255 });
});

test("tooltip is kept inside the visible area at its edges", () => {
  const bounds = { left: 0, top: 0, right: 800, bottom: 410 };
  assert.deepEqual(placeNodeTooltip({ x: 10, y: 200 }, { width: 72, height: 25 }, bounds), { x: 6, y: 155 });
  assert.deepEqual(placeNodeTooltip({ x: 795, y: 200 }, { width: 72, height: 25 }, bounds), { x: 722, y: 155 });
  assert.deepEqual(placeNodeTooltip({ x: 400, y: 30 }, { width: 72, height: 25 }, bounds), { x: 364, y: 55 });
});
