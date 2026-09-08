import assert from "node:assert/strict";
import test from "node:test";
import { buildNodeAbbreviations } from "../../src/utils/nodePresentation.js";

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
