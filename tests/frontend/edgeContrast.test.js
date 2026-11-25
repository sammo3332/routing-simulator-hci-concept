import assert from "node:assert/strict";
import test from "node:test";
import { EDGE_IDLE, PANEL_BACKGROUND, RED, T1, T2 } from "../../src/styles/sharedStyles.js";

function luminance(hex) {
  const [red, green, blue] = [1, 3, 5].map(index => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(left, right) {
  const [high, low] = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

test("Kanten ohne Route erreichen 3:1 zum Flächenhintergrund", () => {
  assert.ok(contrast(EDGE_IDLE, PANEL_BACKGROUND) >= 3);
});

test("Routen- und Ausfallfarben bleiben kontraststärker als Kanten ohne Route", () => {
  const idle = contrast(EDGE_IDLE, PANEL_BACKGROUND);
  for (const color of [T1, T2, RED]) {
    assert.ok(contrast(color, PANEL_BACKGROUND) > idle);
  }
});
