import assert from "node:assert/strict";
import test from "node:test";
import { buildInterpretation } from "../../src/utils/interpretation.js";

const base = {
  strategy: "deterministic_shortest_path",
  edgeConnectivity: 0,
  failedEdgeCount: 0,
  failedEdgeSummary: "keine",
  reroutedNodeIds: [],
  unreachableNodeIds: [],
  routingFailureNodeIds: [],
  targetNodeId: "A",
  reachableCount: 4,
  nodeCount: 4,
};

test("Normalzustand ohne Satzzeichenfehler", () => {
  assert.equal(
    buildInterpretation(base),
    "0 aktive Kantenausfälle (keine); 0 umgeleitete Routen; "
      + "0 physisch unerreichbare Knoten; 0 Routingfehler trotz physischer Verbindung. "
      + "Zielknoten: A. Erfolgreich zugestellt: 4/4.",
  );
});

test("Einzahl und Mehrzahl der Kantenausfälle", () => {
  assert.match(
    buildInterpretation({ ...base, failedEdgeCount: 1, failedEdgeSummary: "a A–T" }),
    /^1 aktiver Kantenausfall \(a A–T\); /,
  );
  assert.match(
    buildInterpretation({ ...base, failedEdgeCount: 2, failedEdgeSummary: "a A–T, c B–T" }),
    /^2 aktive Kantenausfälle \(a A–T, c B–T\); /,
  );
});

test("Bonsai nennt Aboreszenzen und betroffene Knoten", () => {
  const text = buildInterpretation({
    ...base,
    strategy: "bonsai_greedy",
    edgeConnectivity: 1,
    failedEdgeCount: 1,
    failedEdgeSummary: "a A–T",
    reroutedNodeIds: ["B"],
    unreachableNodeIds: ["X"],
    routingFailureNodeIds: ["A"],
    reachableCount: 2,
  });
  assert.equal(
    text,
    "Bonsai mit 1 Aboreszenzen; 1 aktiver Kantenausfall (a A–T); 1 umgeleitete Route (B); "
      + "1 physisch unerreichbare Knoten (X); 1 Routingfehler trotz physischer Verbindung (A). "
      + "Zielknoten: A. Erfolgreich zugestellt: 2/4.",
  );
});

test("Lange Knotenlisten verweisen auf die Routingzusammenfassung", () => {
  const many = ["1", "2", "3", "4", "5", "6"];
  const text = buildInterpretation({ ...base, reroutedNodeIds: many, unreachableNodeIds: many });
  assert.match(text, /6 umgeleitete Routen \(siehe Routingzusammenfassung\); /);
  assert.match(text, /6 physisch unerreichbare Knoten \(siehe Routingzusammenfassung\); /);
});
