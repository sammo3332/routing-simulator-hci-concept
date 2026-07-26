from __future__ import annotations

from heapq import heappop, heappush
from math import isclose

from .models import Edge, PathResult, RoutingConfig, RoutingResult, Topology


def _edge_cost(edge: Edge, config: RoutingConfig) -> float:
    return 1.0 if config.weight_mode == "hop_count" else float(edge.weight)


def _adjacency(
    topology: Topology, failed_edge_ids: frozenset[str]
) -> dict[str, list[tuple[str, Edge]]]:
    adjacency: dict[str, list[tuple[str, Edge]]] = {
        node.id: [] for node in topology.nodes
    }
    for edge in topology.edges:
        if edge.id in failed_edge_ids:
            continue
        adjacency[edge.source].append((edge.target, edge))
        if not topology.directed:
            adjacency[edge.target].append((edge.source, edge))
    for entries in adjacency.values():
        entries.sort(key=lambda item: (item[0], item[1].id))
    return adjacency


def _shortest_path(
    topology: Topology,
    config: RoutingConfig,
    source: str,
    failed_edge_ids: frozenset[str],
) -> PathResult | None:
    target = config.target_node_id
    if source == target:
        return PathResult((target,), (), 0.0)

    adjacency = _adjacency(topology, failed_edge_ids)
    queue: list[
        tuple[float, tuple[str, ...], tuple[str, ...], str]
    ] = [(0.0, (source,), (), source)]
    best: dict[str, tuple[float, tuple[str, ...], tuple[str, ...]]] = {}

    while queue:
        cost, node_path, edge_path, node_id = heappop(queue)
        candidate_key = (cost, node_path, edge_path)
        previous = best.get(node_id)
        if previous is not None:
            previous_cost, previous_nodes, previous_edges = previous
            if cost > previous_cost and not isclose(cost, previous_cost):
                continue
            if isclose(cost, previous_cost) and (
                node_path,
                edge_path,
            ) >= (previous_nodes, previous_edges):
                continue
        best[node_id] = candidate_key

        if node_id == target:
            return PathResult(node_path, edge_path, cost)

        for neighbor, edge in adjacency[node_id]:
            if neighbor in node_path:
                continue
            next_cost = cost + _edge_cost(edge, config)
            heappush(
                queue,
                (
                    next_cost,
                    node_path + (neighbor,),
                    edge_path + (edge.id,),
                    neighbor,
                ),
            )
    return None


def _all_paths(
    topology: Topology,
    config: RoutingConfig,
    failed_edge_ids: frozenset[str],
) -> dict[str, PathResult | None]:
    return {
        node.id: _shortest_path(topology, config, node.id, failed_edge_ids)
        for node in sorted(topology.nodes, key=lambda item: item.id)
    }


def compute_routing_result(
    topology: Topology,
    config: RoutingConfig,
    failed_edge_ids: frozenset[str] = frozenset(),
) -> RoutingResult:
    baseline = _all_paths(topology, config, frozenset())
    current = (
        baseline
        if not failed_edge_ids
        else _all_paths(topology, config, failed_edge_ids)
    )

    affected = tuple(
        node_id
        for node_id in sorted(baseline)
        if baseline[node_id] is not None and current[node_id] is None
    )
    changed = tuple(
        node_id
        for node_id in sorted(baseline)
        if baseline[node_id] != current[node_id]
    )
    return RoutingResult(
        baseline_paths=baseline,
        current_paths=current,
        affected_node_ids=affected,
        changed_node_ids=changed,
    )
