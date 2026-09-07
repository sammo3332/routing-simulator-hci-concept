from __future__ import annotations

from itertools import combinations

from .models import RoutingConfig, SearchResult, Topology
from .routing import compute_routing_result


def find_first_minimal_failure(
    topology: Topology,
    routing_config: RoutingConfig,
    max_k: int,
) -> SearchResult:
    if max_k < 1:
        raise ValueError("max_k must be at least 1")
    if max_k > len(topology.edges):
        raise ValueError("max_k must not exceed the number of edges")

    edge_ids = tuple(sorted(edge.id for edge in topology.edges))
    tested = 0
    decomposition = None
    if routing_config.strategy == "bonsai_greedy":
        from .bonsai import build_greedy_arborescences

        decomposition = build_greedy_arborescences(
            topology, routing_config.target_node_id
        )
    for k in range(1, max_k + 1):
        for candidate in combinations(edge_ids, k):
            tested += 1
            if decomposition is None:
                routing_result = compute_routing_result(
                    topology,
                    routing_config,
                    frozenset(candidate),
                )
                critical_node_ids = routing_result.affected_node_ids
                failure_type = "physical_disconnection"
            else:
                from .bonsai import compute_bonsai_routing_result

                routing_result = compute_bonsai_routing_result(
                    topology,
                    routing_config,
                    frozenset(candidate),
                    decomposition=decomposition,
                )
                critical_node_ids = routing_result.routing_failure_node_ids
                failure_type = "routing_failure"
            if critical_node_ids:
                return SearchResult(
                    status="found",
                    failed_edge_ids=candidate,
                    affected_node_ids=critical_node_ids,
                    tested_combinations=tested,
                    found_at_k=k,
                    routing_result=routing_result,
                    failure_type=failure_type,
                )

    return SearchResult(
        status="not_found",
        failed_edge_ids=None,
        affected_node_ids=(),
        tested_combinations=tested,
        found_at_k=None,
        routing_result=None,
    )
