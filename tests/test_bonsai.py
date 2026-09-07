from __future__ import annotations

from backend.failover_core.bonsai import (
    build_greedy_arborescences,
    edge_connectivity,
    simulate_bonsai_route,
)
from backend.failover_core.models import (
    Edge,
    FailureState,
    Node,
    RoutingConfig,
    Scenario,
    Topology,
)
from backend.failover_core.routing import compute_routing_result
from backend.failover_core.search import find_first_minimal_failure
from backend.failover_core.serialization import export_scenario_json, import_scenario_json


def topology(edge_specs: list[tuple[str, str, str]]) -> Topology:
    node_ids = sorted(
        {node_id for _, source, target in edge_specs for node_id in (source, target)}
    )
    return Topology(
        topology_id="bonsai-test",
        directed=False,
        multigraph=False,
        nodes=tuple(Node(node_id) for node_id in node_ids),
        edges=tuple(Edge(edge_id, source, target) for edge_id, source, target in edge_specs),
    )


def cycle() -> Topology:
    return topology(
        [
            ("a", "T", "A"),
            ("b", "A", "B"),
            ("c", "B", "C"),
            ("d", "C", "T"),
        ]
    )


def bonsai_config() -> RoutingConfig:
    return RoutingConfig(target_node_id="T", strategy="bonsai_greedy")


def test_edge_connectivity_for_line_cycle_and_bottleneck() -> None:
    line = topology([("a", "A", "B"), ("b", "B", "T")])
    bottleneck = topology(
        [
            ("a", "A", "B"),
            ("b", "B", "C"),
            ("c", "C", "A"),
            ("d", "C", "T"),
        ]
    )

    assert edge_connectivity(line) == 1
    assert edge_connectivity(cycle()) == 2
    assert edge_connectivity(bottleneck) == 1


def test_parallel_physical_links_keep_independent_arc_capacity() -> None:
    graph = Topology(
        topology_id="parallel",
        directed=False,
        multigraph=True,
        nodes=(Node("A"), Node("T")),
        edges=(Edge("a", "A", "T"), Edge("b", "A", "T")),
    )

    decomposition = build_greedy_arborescences(graph, "T")

    assert decomposition.edge_connectivity == 2
    assert [tree.edge_id_by_node["A"] for tree in decomposition.arborescences] == [
        "a",
        "b",
    ]


def test_greedy_builder_creates_complete_arc_disjoint_trees() -> None:
    graph = cycle()

    decomposition = build_greedy_arborescences(graph, "T")

    assert decomposition.edge_connectivity == 2
    assert len(decomposition.arborescences) == 2
    used_arcs: set[tuple[str, str, str]] = set()
    for tree in decomposition.arborescences:
        assert set(tree.next_hop_by_node) == {"A", "B", "C"}
        for node in ("A", "B", "C"):
            seen = set()
            current = node
            while current != "T":
                assert current not in seen
                seen.add(current)
                current = tree.next_hop_by_node[current]
        for arc in tree.arcs:
            key = (arc.edge_id, arc.source, arc.target)
            assert key not in used_arcs
            used_arcs.add(key)


def test_same_input_produces_same_greedy_decomposition() -> None:
    graph = cycle()

    first = build_greedy_arborescences(graph, "T")
    second = build_greedy_arborescences(
        Topology(
            topology_id=graph.topology_id,
            directed=False,
            multigraph=False,
            nodes=tuple(reversed(graph.nodes)),
            edges=tuple(reversed(graph.edges)),
        ),
        "T",
    )

    assert first == second


def test_bonsai_switches_tree_and_delivers_after_physical_link_failure() -> None:
    graph = cycle()
    decomposition = build_greedy_arborescences(graph, "T")

    route = simulate_bonsai_route(
        graph,
        decomposition.arborescences,
        "A",
        "T",
        frozenset({"a"}),
    )

    assert route.status == "delivered"
    assert route.node_ids == ("A", "B", "C", "T")
    assert route.switch_count == 1
    assert route.steps[0].action == "switch"
    assert route.steps[0].tree_id == "T1"
    assert route.steps[1].tree_id == "T2"


def test_result_distinguishes_physical_disconnection_from_routing_failure() -> None:
    graph = topology(
        [
            ("a", "A", "T"),
            ("b", "A", "B"),
            ("c", "B", "T"),
            ("d", "X", "T"),
        ]
    )

    result = compute_routing_result(graph, bonsai_config(), frozenset({"a"}))

    assert result.edge_connectivity == 1
    assert "A" in result.routing_failure_node_ids
    assert "A" in result.loop_node_ids
    assert "A" not in result.physically_unreachable_node_ids
    assert result.route_status_by_node["A"] == "loop"


def test_physical_disconnection_is_reported_separately() -> None:
    graph = topology([("a", "A", "T")])

    result = compute_routing_result(graph, bonsai_config(), frozenset({"a"}))

    assert result.route_status_by_node["A"] == "physically_unreachable"
    assert result.physically_unreachable_node_ids == ("A",)
    assert result.routing_failure_node_ids == ()


def test_bonsai_search_ignores_disconnections_and_finds_routing_failure() -> None:
    graph = topology(
        [
            ("a", "A", "T"),
            ("b", "A", "B"),
            ("c", "B", "T"),
            ("d", "X", "T"),
        ]
    )

    result = find_first_minimal_failure(graph, bonsai_config(), max_k=1)

    assert result.status == "found"
    assert result.failure_type == "routing_failure"
    assert result.failed_edge_ids == ("a",)
    assert "A" in result.affected_node_ids


def test_bonsai_scenario_roundtrip_recomputes_same_snapshot() -> None:
    scenario = Scenario(
        format_version="1.0",
        scenario_id="bonsai-roundtrip",
        topology=cycle(),
        routing=bonsai_config(),
        failures=FailureState(frozenset({"a"})),
    )

    imported = import_scenario_json(export_scenario_json(scenario))

    assert imported.snapshot_matches is True
    assert imported.scenario.routing.strategy == "bonsai_greedy"
