import assert from "node:assert/strict";
import test from "node:test";
import {
  applyNodePositions, eventPointInSvg, moveNodePosition,
} from "../../src/utils/graphLayout.js";

function graph() {
  return {
    nodes: [
      { id: "A", position: { x: 20, y: 40 }, target: false },
      { id: "T", position: { x: 100, y: 80 }, target: true },
      { id: "B", position: { x: 150, y: 120 } },
    ],
    links: [
      { id: "a", source: "A", target: "T", weight: 7, failed: true, baseline: true },
      { id: "b", source: "B", target: "A", current: true,
        treeArc: { source: "B", target: "A", edge_id: "b" } },
    ],
  };
}

test("moving one node updates outgoing and incoming edges and failure markers", () => {
  const { nodes, links } = graph();
  const moved = applyNodePositions(nodes, links, { A: { x: 60, y: 10 } });
  assert.deepEqual(moved.nodes[0].position, { x: 60, y: 10 });
  assert.deepEqual(moved.nodes[1].position, nodes[1].position);
  assert.deepEqual(moved.nodes[2].position, nodes[2].position);
  assert.deepEqual(moved.links[0].sourcePosition, { x: 60, y: 10 });
  assert.deepEqual(moved.links[0].targetPosition, { x: 100, y: 80 });
  assert.deepEqual(moved.links[0].midpoint, { x: 80, y: 45 });
  assert.deepEqual(moved.links[1].targetPosition, { x: 60, y: 10 });
});

test("layout edits do not mutate topology, weights, flags or directed tree arcs", () => {
  const original = graph();
  const before = structuredClone(original);
  const moved = applyNodePositions(original.nodes, original.links, { A: { x: 300, y: -20 } });
  assert.deepEqual(original, before);
  assert.equal(moved.links[0].weight, 7);
  assert.equal(moved.links[0].failed, true);
  assert.equal(moved.links[0].baseline, true);
  assert.equal(moved.links[1].current, true);
  assert.deepEqual(moved.links[1].treeArc, original.links[1].treeArc);
});

test("resetting overrides restores the original node and edge positions", () => {
  const { nodes, links } = graph();
  const reset = applyNodePositions(nodes, links, {});
  assert.deepEqual(reset.nodes, nodes);
  assert.deepEqual(reset.links[0].sourcePosition, nodes[0].position);
});

test("new routing metadata can be applied while keeping manual positions", () => {
  const { nodes, links } = graph();
  const updated = applyNodePositions(
    nodes.map(node => ({ ...node, changed: true })),
    links.map(link => ({ ...link, failed: false })),
    { A: { x: 200, y: 10 } },
  );
  assert.deepEqual(updated.nodes[0].position, { x: 200, y: 10 });
  assert.equal(updated.nodes[0].changed, true);
  assert.equal(updated.links[0].failed, false);
});

test("arbitrary node IDs do not use inherited object properties as coordinates", () => {
  const nodes = ["constructor", "__proto__"].map(id => ({ id, position: { x: 1, y: 2 } }));
  assert.deepEqual(applyNodePositions(nodes, [], {}).nodes, nodes);
});

test("node dragging accounts for graph zoom without jumping to the pointer", () => {
  for (const scale of [0.5, 1, 2, 6]) {
    assert.deepEqual(moveNodePosition(
      { x: 20, y: 30 }, { x: 100, y: 120 }, { x: 160, y: 90 }, scale,
    ), { x: 20 + 60 / scale, y: 30 - 30 / scale });
  }
});

test("SVG coordinate conversion uses the inverse screen transform", () => {
  const inverse = { a: 0.5, d: 0.5, e: -50, f: -20 };
  const svg = {
    getScreenCTM: () => ({ inverse: () => inverse }),
    createSVGPoint: () => ({
      matrixTransform(matrix) {
        return { x: this.x * matrix.a + matrix.e, y: this.y * matrix.d + matrix.f };
      },
    }),
  };
  assert.deepEqual(eventPointInSvg(svg, 300, 200), { x: 100, y: 80 });
  assert.equal(eventPointInSvg({ getScreenCTM: () => null }, 0, 0), null);
});

test("empty graphs can be laid out and reset safely", () => {
  assert.deepEqual(applyNodePositions([], [], {}), { nodes: [], links: [] });
});
