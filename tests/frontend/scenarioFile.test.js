import assert from "node:assert/strict";
import test from "node:test";
import { describeScenario, scenarioFileName } from "../../src/utils/scenarioFile.js";

const date = new Date(2026, 10, 26, 9, 5);

test("file name contains topology name and local timestamp", () => {
  assert.equal(scenarioFileName("germany50", date), "szenario-germany50-20261126-0905.json");
});

test("file name is safe for unusual topology names", () => {
  assert.equal(
    scenarioFileName("Köln / Düsseldorf: Test*?", date),
    "szenario-koln-dusseldorf-test-20261126-0905.json",
  );
  assert.equal(scenarioFileName("", date), "szenario-topologie-20261126-0905.json");
  assert.equal(scenarioFileName(undefined, date), "szenario-topologie-20261126-0905.json");
  assert.ok(scenarioFileName("x".repeat(200), date).length < 70);
});

test("description names the restored domain settings", () => {
  const simulation = {
    topology: { nodes: [1, 2, 3, 4], edges: [1, 2, 3, 4] },
    routing: { target_node_id: "T", strategy: "bonsai_greedy", weight_mode: "hop_count" },
    failures: { failed_edge_ids: ["a"] },
  };
  assert.equal(
    describeScenario(simulation),
    "4 Knoten, 4 Kanten, Ziel T, Bonsai (Greedy), Hop-Anzahl, 1 Ausfall",
  );
  assert.equal(
    describeScenario({
      ...simulation,
      routing: { target_node_id: "2", strategy: "deterministic_shortest_path", weight_mode: "edge_weight" },
      failures: { failed_edge_ids: [] },
    }),
    "4 Knoten, 4 Kanten, Ziel 2, Kürzester Pfad, Kantengewicht, 0 Ausfälle",
  );
});
