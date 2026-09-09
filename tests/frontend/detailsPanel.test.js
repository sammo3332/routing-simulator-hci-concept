import assert from "node:assert/strict";
import test from "node:test";
import {
  clampDetailsHeight,
  resizeDetailsFromPointerDelta,
} from "../../src/utils/detailsPanel.js";

test("detail height stays between the graph and detail minimums", () => {
  assert.equal(clampDetailsHeight(100, 500), 240);
  assert.equal(clampDetailsHeight(360, 500), 360);
  assert.equal(clampDetailsHeight(700, 500), 500);
});

test("dragging the separator down gives the graph more room", () => {
  assert.equal(resizeDetailsFromPointerDelta(380, 80, 600), 300);
});

test("dragging the separator up gives the details more room", () => {
  assert.equal(resizeDetailsFromPointerDelta(380, -80, 600), 460);
});

test("resizing respects both limits", () => {
  assert.equal(resizeDetailsFromPointerDelta(380, 500, 600), 240);
  assert.equal(resizeDetailsFromPointerDelta(380, -500, 600), 600);
});
