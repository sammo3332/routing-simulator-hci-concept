from __future__ import annotations

from dataclasses import replace

import pytest

from backend.failover_core.models import (
    Edge,
    FailureState,
    Node,
    RoutingConfig,
    Scenario,
    SearchConfig,
    Topology,
)
from backend.failover_core.routing import compute_routing_result
from backend.failover_core.search import find_first_minimal_failure
from backend.failover_core.serialization import (
    export_scenario_json,
    import_scenario_json,
    scenario_to_dict,
)
from backend.failover_core.validation import ScenarioValidationError, validate_scenario


def topology(
    edge_specs: list[tuple[str, str, str, float]],
    *,
    directed: bool = False,
    multigraph: bool = False,
) -> Topology:
    node_ids = sorted(
        {node_id for _, source, target, _ in edge_specs for node_id in (source, target)}
    )
    return Topology(
        topology_id="test-topology",
        directed=directed,
        multigraph=multigraph,
        nodes=tuple(Node(node_id) for node_id in node_ids),
        edges=tuple(
            Edge(edge_id, source, target, weight)
            for edge_id, source, target, weight in edge_specs
        ),
    )


def config(target: str = "T", weight_mode: str = "hop_count") -> RoutingConfig:
    return RoutingConfig(target_node_id=target, weight_mode=weight_mode)


def test_direct_path_is_computed_for_each_node() -> None:
    graph = topology([("e-at", "A", "T", 1)])

    result = compute_routing_result(graph, config())

    assert result.current_paths["A"].node_ids == ("A", "T")
    assert result.current_paths["A"].edge_ids == ("e-at",)
    assert result.current_paths["T"].node_ids == ("T",)
    assert result.affected_node_ids == ()
    assert result.changed_node_ids == ()


def test_edge_failure_reroutes_and_marks_route_as_changed() -> None:
    graph = topology(
        [
            ("e-ab", "A", "B", 1),
            ("e-bt", "B", "T", 1),
            ("e-ac", "A", "C", 1),
            ("e-ct", "C", "T", 1),
        ]
    )

    result = compute_routing_result(graph, config(), frozenset({"e-ab"}))

    assert result.baseline_paths["A"].node_ids == ("A", "B", "T")
    assert result.current_paths["A"].node_ids == ("A", "C", "T")
    assert "A" in result.changed_node_ids
    assert result.affected_node_ids == ()


def test_disconnection_marks_only_previously_reachable_nodes_as_affected() -> None:
    graph = topology(
        [
            ("e-ab", "A", "B", 1),
            ("e-bt", "B", "T", 1),
            ("e-xy", "X", "Y", 1),
        ]
    )

    result = compute_routing_result(graph, config(), frozenset({"e-bt"}))

    assert result.affected_node_ids == ("A", "B")
    assert "X" not in result.affected_node_ids
    assert result.baseline_paths["X"] is None


def test_minimal_search_stops_at_first_deterministic_size_two_failure() -> None:
    graph = topology(
        [
            ("a", "A", "B", 1),
            ("b", "B", "T", 1),
            ("c", "A", "C", 1),
            ("d", "C", "T", 1),
        ]
    )

    result = find_first_minimal_failure(graph, config(), max_k=2)

    assert result.status == "found"
    assert result.found_at_k == 2
    assert result.failed_edge_ids == ("a", "b")
    assert result.affected_node_ids == ("B",)
    assert result.tested_combinations == 5


def test_minimal_search_reports_when_no_failure_exists_within_limit() -> None:
    graph = topology(
        [
            ("a", "A", "B", 1),
            ("b", "B", "T", 1),
            ("c", "A", "T", 1),
        ]
    )

    result = find_first_minimal_failure(graph, config(), max_k=1)

    assert result.status == "not_found"
    assert result.failed_edge_ids is None
    assert result.affected_node_ids == ()
    assert result.tested_combinations == 3
    assert result.found_at_k is None
    assert result.routing_result is None


@pytest.mark.parametrize("max_k", [0, -1])
def test_minimal_search_rejects_non_positive_max_k(max_k: int) -> None:
    graph = topology([("a", "A", "T", 1)])

    with pytest.raises(ValueError, match="at least 1"):
        find_first_minimal_failure(graph, config(), max_k=max_k)


def test_minimal_search_rejects_max_k_above_edge_count() -> None:
    graph = topology([("a", "A", "T", 1)])

    with pytest.raises(ValueError, match="must not exceed"):
        find_first_minimal_failure(graph, config(), max_k=2)


def test_tie_break_is_independent_of_edge_input_order() -> None:
    edge_specs = [
        ("e-z", "A", "C", 1),
        ("e-ct", "C", "T", 1),
        ("e-a", "A", "B", 1),
        ("e-bt", "B", "T", 1),
    ]
    first = topology(edge_specs)
    second = replace(first, edges=tuple(reversed(first.edges)))

    first_path = compute_routing_result(first, config()).current_paths["A"]
    second_path = compute_routing_result(second, config()).current_paths["A"]

    assert first_path == second_path
    assert first_path.node_ids == ("A", "B", "T")


def test_parallel_edge_failure_keeps_alternative_edge_available() -> None:
    graph = topology(
        [
            ("e-1", "A", "T", 1),
            ("e-2", "A", "T", 1),
        ],
        multigraph=True,
    )

    result = compute_routing_result(graph, config(), frozenset({"e-1"}))

    assert result.current_paths["A"].edge_ids == ("e-2",)
    assert result.affected_node_ids == ()


def test_directed_edges_are_not_traversed_backwards() -> None:
    graph = topology([("e-ta", "T", "A", 1)], directed=True)

    result = compute_routing_result(graph, config())

    assert result.current_paths["A"] is None
    assert result.current_paths["T"].node_ids == ("T",)


def test_weighted_mode_prefers_lower_total_weight() -> None:
    graph = topology(
        [
            ("e-at", "A", "T", 10),
            ("e-ab", "A", "B", 2),
            ("e-bt", "B", "T", 2),
        ]
    )

    hops = compute_routing_result(graph, config(weight_mode="hop_count"))
    weighted = compute_routing_result(graph, config(weight_mode="edge_weight"))

    assert hops.current_paths["A"].edge_ids == ("e-at",)
    assert weighted.current_paths["A"].edge_ids == ("e-ab", "e-bt")
    assert weighted.current_paths["A"].total_weight == 4


def test_json_roundtrip_recomputes_identical_snapshot() -> None:
    graph = topology(
        [
            ("e-ab", "A", "B", 1),
            ("e-bt", "B", "T", 1),
            ("e-at", "A", "T", 3),
        ]
    )
    scenario = Scenario(
        format_version="1.0",
        scenario_id="roundtrip",
        topology=graph,
        routing=config(weight_mode="edge_weight"),
        failures=FailureState(frozenset({"e-bt"}), origin="manual"),
        search_configuration=SearchConfig(max_k=2),
    )

    payload = export_scenario_json(scenario)
    imported = import_scenario_json(payload)

    assert imported.snapshot_matches is True
    assert scenario_to_dict(
        imported.scenario, imported.routing_result
    ) == scenario_to_dict(
        scenario,
        compute_routing_result(
            scenario.topology,
            scenario.routing,
            scenario.failures.failed_edge_ids,
        ),
    )


def test_unknown_failed_edge_is_rejected_semantically() -> None:
    scenario = Scenario(
        format_version="1.0",
        scenario_id="invalid",
        topology=topology([("e-at", "A", "T", 1)]),
        routing=config(),
        failures=FailureState(frozenset({"does-not-exist"})),
    )

    with pytest.raises(ScenarioValidationError, match="unknown IDs"):
        validate_scenario(scenario)
