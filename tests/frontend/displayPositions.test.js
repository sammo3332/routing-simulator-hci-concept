import assert from "node:assert/strict";
import test from "node:test";
import { validPositions } from "../../src/utils/displayPositions.js";

test("restored display positions keep only complete finite coordinates", () => {
  assert.deepEqual(
    validPositions({
      A: { x: 1, y: 2, extra: true },
      B: { x: Number.NaN, y: 2 },
      C: { x: 3 },
      D: null,
      E: { x: 1e6, y: 0 },
    }),
    { A: { x: 1, y: 2 } },
  );
  assert.deepEqual(validPositions(undefined), {});
});
