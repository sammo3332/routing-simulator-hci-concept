from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Iterable

from .models import (
    Arborescence,
    BonsaiRoute,
    DirectedArc,
    PathResult,
    RoutingConfig,
    RoutingResult,
    RoutingStep,
    Topology,
)


class BonsaiConstructionError(ValueError):
    """Raised when a topology cannot be decomposed for Bonsai routing."""


@dataclass(frozen=True, slots=True)
class BonsaiDecomposition:
    edge_connectivity: int
    arborescences: tuple[Arborescence, ...]


def _bidirected_arcs(topology: Topology) -> tuple[DirectedArc, ...]:
    if topology.directed:
        raise BonsaiConstructionError(
            "Bonsai requires an undirected physical topology"
        )
    arcs: list[DirectedArc] = []
    for edge in sorted(topology.edges, key=lambda item: item.id):
        if edge.source == edge.target:
            continue
        arcs.append(DirectedArc(edge.id, edge.source, edge.target))
        arcs.append(DirectedArc(edge.id, edge.target, edge.source))
    return tuple(arcs)


def _max_arc_disjoint_paths(
    node_ids: Iterable[str],
    arcs: Iterable[DirectedArc],
    source: str,
    target: str,
    *,
    limit: int | None = None,
) -> int:
    """Compute a unit-capacity max flow; parallel arcs remain independent."""
    if source == target:
        return limit if limit is not None else 0
    nodes = tuple(node_ids)
    capacity: dict[str, dict[str, int]] = {node: {} for node in nodes}
    residual_neighbors: dict[str, set[str]] = {node: set() for node in nodes}
    for arc in arcs:
        capacity[arc.source][arc.target] = (
            capacity[arc.source].get(arc.target, 0) + 1
        )
        residual_neighbors[arc.source].add(arc.target)
        residual_neighbors[arc.target].add(arc.source)

    residual = {
        node: {
            neighbor: capacity[node].get(neighbor, 0)
            for neighbor in residual_neighbors[node]
        }
        for node in nodes
    }
    flow = 0
    while limit is None or flow < limit:
        parent: dict[str, str | None] = {source: None}
        queue = deque([source])
        while queue and target not in parent:
            node = queue.popleft()
            for neighbor in sorted(residual_neighbors[node]):
                if neighbor in parent or residual[node].get(neighbor, 0) <= 0:
                    continue
                parent[neighbor] = node
                queue.append(neighbor)
        if target not in parent:
            break
        node = target
        while parent[node] is not None:
            previous = parent[node]
            residual[previous][node] -= 1
            residual[node][previous] = residual[node].get(previous, 0) + 1
            node = previous
        flow += 1
    return flow


def edge_connectivity(topology: Topology) -> int:
    """Return global physical edge connectivity for an undirected topology."""
    node_ids = tuple(sorted(node.id for node in topology.nodes))
    if len(node_ids) < 2:
        return 0
    arcs = _bidirected_arcs(topology)
    anchor = node_ids[0]
    best = len(topology.edges) + 1
    for target in node_ids[1:]:
        connectivity = _max_arc_disjoint_paths(
            node_ids, arcs, anchor, target, limit=best
        )
        best = min(best, connectivity)
        if best == 0:
            return 0
    return best


def _tree_depth(next_hop_by_node: dict[str, str], target: str) -> int:
    maximum = 0
    for start in next_hop_by_node:
        node = start
        seen: set[str] = set()
        depth = 0
        while node != target:
            if node in seen or node not in next_hop_by_node:
                raise BonsaiConstructionError("constructed tree is not an arborescence")
            seen.add(node)
            node = next_hop_by_node[node]
            depth += 1
        maximum = max(maximum, depth)
    return maximum


def build_greedy_arborescences(
    topology: Topology, target_node_id: str
) -> BonsaiDecomposition:
    """Build the sequential low-depth greedy decomposition from the paper."""
    node_ids = tuple(sorted(node.id for node in topology.nodes))
    if target_node_id not in node_ids:
        raise BonsaiConstructionError("target node does not exist")
    if len(node_ids) < 2:
        raise BonsaiConstructionError(
            "Bonsai requires a topology with at least two nodes"
        )

    all_arcs = _bidirected_arcs(topology)
    connectivity = edge_connectivity(topology)
    if connectivity < 1:
        raise BonsaiConstructionError(
            "Bonsai requires a connected undirected topology"
        )

    used_arcs: set[DirectedArc] = set()
    trees: list[Arborescence] = []
    for tree_number in range(1, connectivity + 1):
        tree_nodes = {target_node_id}
        node_depth = {target_node_id: 0}
        next_hop: dict[str, str] = {}
        edge_by_node: dict[str, str] = {}
        tree_arcs: list[DirectedArc] = []
        required_remaining_paths = connectivity - tree_number

        while len(tree_nodes) < len(node_ids):
            candidates = [
                arc
                for arc in all_arcs
                if arc not in used_arcs
                and arc.source not in tree_nodes
                and arc.target in tree_nodes
            ]
            candidates.sort(
                key=lambda arc: (
                    max(
                        max(node_depth.values(), default=0),
                        node_depth[arc.target] + 1,
                    ),
                    node_depth[arc.target] + 1,
                    arc.source,
                    arc.target,
                    arc.edge_id,
                )
            )

            chosen: DirectedArc | None = None
            for candidate in candidates:
                if required_remaining_paths:
                    remaining = (
                        arc
                        for arc in all_arcs
                        if arc not in used_arcs and arc != candidate
                    )
                    path_count = _max_arc_disjoint_paths(
                        node_ids,
                        remaining,
                        candidate.source,
                        target_node_id,
                        limit=required_remaining_paths,
                    )
                    if path_count < required_remaining_paths:
                        continue
                chosen = candidate
                break

            if chosen is None:
                raise BonsaiConstructionError(
                    f"greedy construction stopped while building T{tree_number}"
                )

            used_arcs.add(chosen)
            tree_arcs.append(chosen)
            tree_nodes.add(chosen.source)
            next_hop[chosen.source] = chosen.target
            edge_by_node[chosen.source] = chosen.edge_id
            node_depth[chosen.source] = node_depth[chosen.target] + 1

        tree_id = f"T{tree_number}"
        trees.append(
            Arborescence(
                tree_id=tree_id,
                target_node_id=target_node_id,
                arcs=tuple(tree_arcs),
                next_hop_by_node=dict(next_hop),
                edge_id_by_node=dict(edge_by_node),
                depth=_tree_depth(next_hop, target_node_id),
            )
        )

    return BonsaiDecomposition(connectivity, tuple(trees))


def _physically_reachable_nodes(
    topology: Topology,
    target_node_id: str,
    failed_edge_ids: frozenset[str],
) -> set[str]:
    adjacency = {node.id: [] for node in topology.nodes}
    for edge in topology.edges:
        if edge.id in failed_edge_ids:
            continue
        adjacency[edge.source].append(edge.target)
        if not topology.directed:
            adjacency[edge.target].append(edge.source)
    reachable = {target_node_id}
    queue = deque([target_node_id])
    while queue:
        node = queue.popleft()
        for neighbor in adjacency[node]:
            if neighbor not in reachable:
                reachable.add(neighbor)
                queue.append(neighbor)
    return reachable


def simulate_bonsai_route(
    topology: Topology,
    arborescences: tuple[Arborescence, ...],
    source_node_id: str,
    target_node_id: str,
    failed_edge_ids: frozenset[str] = frozenset(),
) -> BonsaiRoute:
    node_ids = {node.id for node in topology.nodes}
    if source_node_id not in node_ids:
        raise ValueError("source node does not exist")
    if target_node_id not in node_ids:
        raise ValueError("target node does not exist")
    if not arborescences:
        raise ValueError("at least one arborescence is required")

    physically_reachable = source_node_id in _physically_reachable_nodes(
        topology, target_node_id, failed_edge_ids
    )
    if not physically_reachable:
        return BonsaiRoute(
            status="physically_unreachable",
            node_ids=(source_node_id,),
            edge_ids=(),
            steps=(
                RoutingStep(
                    node_id=source_node_id,
                    tree_id=arborescences[0].tree_id,
                    action="physically_unreachable",
                ),
            ),
            switch_count=0,
            physically_reachable=False,
        )

    current_node = source_node_id
    incoming_node: str | None = None
    tree_index = 0
    route_nodes = [source_node_id]
    route_edges: list[str] = []
    steps: list[RoutingStep] = []
    visited_states: set[tuple[str, int, str | None]] = set()
    switch_count = 0

    while True:
        tree = arborescences[tree_index]
        state = (current_node, tree_index, incoming_node)
        if state in visited_states:
            steps.append(
                RoutingStep(current_node, tree.tree_id, action="loop")
            )
            return BonsaiRoute(
                "loop",
                tuple(route_nodes),
                tuple(route_edges),
                tuple(steps),
                switch_count,
                True,
            )
        visited_states.add(state)

        if current_node == target_node_id:
            steps.append(
                RoutingStep(current_node, tree.tree_id, action="delivered")
            )
            return BonsaiRoute(
                "delivered",
                tuple(route_nodes),
                tuple(route_edges),
                tuple(steps),
                switch_count,
                True,
            )

        next_node = tree.next_hop_by_node.get(current_node)
        edge_id = tree.edge_id_by_node.get(current_node)
        if next_node is None or edge_id is None:
            steps.append(
                RoutingStep(current_node, tree.tree_id, action="dead_end")
            )
            return BonsaiRoute(
                "dead_end",
                tuple(route_nodes),
                tuple(route_edges),
                tuple(steps),
                switch_count,
                True,
            )

        if edge_id in failed_edge_ids:
            next_tree_index = (tree_index + 1) % len(arborescences)
            steps.append(
                RoutingStep(
                    current_node,
                    tree.tree_id,
                    action="switch",
                    next_node_id=current_node,
                    edge_id=edge_id,
                )
            )
            tree_index = next_tree_index
            switch_count += 1
            continue

        steps.append(
            RoutingStep(
                current_node,
                tree.tree_id,
                action="forward",
                next_node_id=next_node,
                edge_id=edge_id,
            )
        )
        incoming_node = current_node
        current_node = next_node
        route_nodes.append(current_node)
        route_edges.append(edge_id)


def compute_bonsai_routing_result(
    topology: Topology,
    config: RoutingConfig,
    failed_edge_ids: frozenset[str] = frozenset(),
    *,
    decomposition: BonsaiDecomposition | None = None,
) -> RoutingResult:
    decomposition = decomposition or build_greedy_arborescences(
        topology, config.target_node_id
    )
    node_ids = tuple(sorted(node.id for node in topology.nodes))
    baseline_routes = {
        node_id: simulate_bonsai_route(
            topology,
            decomposition.arborescences,
            node_id,
            config.target_node_id,
        )
        for node_id in node_ids
    }
    current_routes = (
        baseline_routes
        if not failed_edge_ids
        else {
            node_id: simulate_bonsai_route(
                topology,
                decomposition.arborescences,
                node_id,
                config.target_node_id,
                failed_edge_ids,
            )
            for node_id in node_ids
        }
    )

    def as_path(route: BonsaiRoute) -> PathResult | None:
        if route.status != "delivered":
            return None
        return PathResult(
            route.node_ids,
            route.edge_ids,
            float(len(route.edge_ids)),
        )

    baseline_paths = {
        node_id: as_path(route) for node_id, route in baseline_routes.items()
    }
    current_paths = {
        node_id: as_path(route) for node_id, route in current_routes.items()
    }
    affected = tuple(
        node_id
        for node_id in node_ids
        if baseline_paths[node_id] is not None and current_paths[node_id] is None
    )
    changed = tuple(
        node_id
        for node_id in node_ids
        if baseline_paths[node_id] != current_paths[node_id]
    )
    physical = tuple(
        node_id
        for node_id in node_ids
        if current_routes[node_id].status == "physically_unreachable"
    )
    routing_failures = tuple(
        node_id
        for node_id in node_ids
        if current_routes[node_id].status in {"dead_end", "loop"}
    )
    loops = tuple(
        node_id
        for node_id in node_ids
        if current_routes[node_id].status == "loop"
    )
    dead_ends = tuple(
        node_id
        for node_id in node_ids
        if current_routes[node_id].status == "dead_end"
    )
    return RoutingResult(
        baseline_paths=baseline_paths,
        current_paths=current_paths,
        affected_node_ids=affected,
        changed_node_ids=changed,
        strategy="bonsai_greedy",
        edge_connectivity=decomposition.edge_connectivity,
        arborescences=decomposition.arborescences,
        route_status_by_node={
            node_id: route.status for node_id, route in current_routes.items()
        },
        routing_failure_node_ids=routing_failures,
        physically_unreachable_node_ids=physical,
        loop_node_ids=loops,
        dead_end_node_ids=dead_ends,
        bonsai_routes=current_routes,
    )
