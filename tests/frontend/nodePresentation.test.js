import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNodeAbbreviations,
  isNodeLabelVisible,
} from "../../src/utils/nodePresentation.js";

test("long node names receive compact deterministic abbreviations", () => {
  assert.deepEqual(
    buildNodeAbbreviations([
      { id: "Aachen" },
      { id: "Darmstadt" },
      { id: "N1" },
    ]),
    { Aachen: "AACH", Darmstadt: "DARM", N1: "N1" },
  );
});

test("duplicate abbreviations are made unique", () => {
  assert.deepEqual(
    buildNodeAbbreviations([
      { id: "Alpha" },
      { id: "Alphabet" },
      { id: "Alphard" },
    ]),
    { Alpha: "ALPH", Alphabet: "ALP2", Alphard: "ALP3" },
  );
});

test("labels and accented names are normalized", () => {
  assert.deepEqual(
    buildNodeAbbreviations([
      { id: "node-1", label: "Köln" },
      { id: "node-2", label: "Bad Homburg" },
    ]),
    { "node-1": "KOLN", "node-2": "BH" },
  );
});

test("node labels stay visible only when requested or contextually important", () => {
  const regularNode = { id: "Dresden" };

  assert.equal(isNodeLabelVisible(regularNode, false), false);
  assert.equal(isNodeLabelVisible(regularNode, true), true);
  assert.equal(isNodeLabelVisible(regularNode, false, "Dresden"), true);
  assert.equal(isNodeLabelVisible({ ...regularNode, target: true }, false), true);
  assert.equal(isNodeLabelVisible({ ...regularNode, affected: true }, false), true);
  assert.equal(isNodeLabelVisible({ ...regularNode, changed: true }, false), true);
});
