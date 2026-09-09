from __future__ import annotations

from itertools import combinations

from backend.failover_core.bonsai import (
    BonsaiDecomposition,
    build_greedy_arborescences,
    compute_bonsai_routing_result,
    edge_connectivity,
)
from backend.failover_core.models import Edge, Node, RoutingConfig, Topology


def _is_connected(
    topology: Topology, failed_edge_ids: frozenset[str] = frozenset()
) -> bool:
    node_ids = {node.id for node in topology.nodes}
    if not node_ids:
        return True
    adjacency = {node_id: set() for node_id in node_ids}
    for edge in topology.edges:
        if edge.id in failed_edge_ids:
            continue
        adjacency[edge.source].add(edge.target)
        adjacency[edge.target].add(edge.source)
    reached = {next(iter(node_ids))}
    frontier = list(reached)
    while frontier:
        node_id = frontier.pop()
        for neighbor in adjacency[node_id] - reached:
            reached.add(neighbor)
            frontier.append(neighbor)
    return reached == node_ids


def _physically_reachable(
    topology: Topology,
    source_node_id: str,
    target_node_id: str,
    failed_edge_ids: frozenset[str],
) -> bool:
    adjacency = {node.id: set() for node in topology.nodes}
    for edge in topology.edges:
        if edge.id in failed_edge_ids:
            continue
        adjacency[edge.source].add(edge.target)
        adjacency[edge.target].add(edge.source)
    reached = {source_node_id}
    frontier = [source_node_id]
    while frontier:
        node_id = frontier.pop()
        if node_id == target_node_id:
            return True
        for neighbor in adjacency[node_id] - reached:
            reached.add(neighbor)
            frontier.append(neighbor)
    return target_node_id in reached


def _brute_force_edge_connectivity(topology: Topology) -> int:
    """Independent oracle: find the smallest physical edge cut by enumeration."""
    edge_ids = tuple(edge.id for edge in topology.edges)
    if len(topology.nodes) < 2:
        return 0
    for cut_size in range(1, len(edge_ids) + 1):
        for failed in combinations(edge_ids, cut_size):
            if not _is_connected(topology, frozenset(failed)):
                return cut_size
    return 0


def _connected_simple_graphs_up_to_five_nodes() -> list[Topology]:
    graphs: list[Topology] = []
    for node_count in range(2, 6):
        node_ids = tuple(f"N{index}" for index in range(node_count))
        possible_edges = tuple(combinations(node_ids, 2))
        for mask in range(1, 1 << len(possible_edges)):
            edges = tuple(
                Edge(f"e{edge_index}", source, target)
                for edge_index, (source, target) in enumerate(possible_edges)
                if mask & (1 << edge_index)
            )
            graph = Topology(
                topology_id=f"simple-n{node_count}-m{mask}",
                directed=False,
                multigraph=False,
                nodes=tuple(Node(node_id) for node_id in node_ids),
                edges=edges,
            )
            if _is_connected(graph):
                graphs.append(graph)
    return graphs


def _validate_decomposition(
    topology: Topology,
    target_node_id: str,
    decomposition: BonsaiDecomposition,
) -> None:
    node_ids = {node.id for node in topology.nodes}
    non_target_nodes = node_ids - {target_node_id}
    physical_edges = {
        edge.id: frozenset((edge.source, edge.target)) for edge in topology.edges
    }
    used_arcs: set[tuple[str, str, str]] = set()

    assert len(decomposition.arborescences) == decomposition.edge_connectivity
    for tree_number, tree in enumerate(decomposition.arborescences, start=1):
        assert tree.tree_id == f"T{tree_number}"
        assert tree.target_node_id == target_node_id
        assert len(tree.arcs) == len(non_target_nodes)
        assert set(tree.next_hop_by_node) == non_target_nodes
        assert set(tree.edge_id_by_node) == non_target_nodes

        mapped_arcs = {
            (tree.edge_id_by_node[source], source, target)
            for source, target in tree.next_hop_by_node.items()
        }
        actual_arcs = {(arc.edge_id, arc.source, arc.target) for arc in tree.arcs}
        assert actual_arcs == mapped_arcs

        maximum_depth = 0
        for start in non_target_nodes:
            current = start
            seen: set[str] = set()
            depth = 0
            while current != target_node_id:
                assert current not in seen
                assert current in tree.next_hop_by_node
                seen.add(current)
                next_node = tree.next_hop_by_node[current]
                edge_id = tree.edge_id_by_node[current]
                assert edge_id in physical_edges
                assert physical_edges[edge_id] == frozenset((current, next_node))
                current = next_node
                depth += 1
                assert depth <= len(non_target_nodes)
            maximum_depth = max(maximum_depth, depth)
        assert tree.depth == maximum_depth

        for arc in actual_arcs:
            assert arc not in used_arcs
            used_arcs.add(arc)


def _assert_route_trace_is_consistent(
    topology: Topology,
    decomposition: BonsaiDecomposition,
    source_node_id: str,
    target_node_id: str,
    failed_edge_ids: frozenset[str],
) -> None:
    result = compute_bonsai_routing_result(
        topology,
        RoutingConfig(target_node_id=target_node_id, strategy="bonsai_greedy"),
        failed_edge_ids,
        decomposition=decomposition,
    )
    route = result.bonsai_routes[source_node_id]
    reachable = _physically_reachable(
        topology, source_node_id, target_node_id, failed_edge_ids
    )

    assert route.physically_reachable is reachable
    assert (route.status == "physically_unreachable") is (not reachable)
    assert route.steps
    assert route.steps[-1].action == route.status

    if not reachable:
        assert route.node_ids == (source_node_id,)
        assert route.edge_ids == ()
        return

    trees = decomposition.arborescences
    current_node = source_node_id
    incoming_node: str | None = None
    tree_index = 0
    visited_states: set[tuple[str, int, str | None]] = set()
    forwarded_nodes = [source_node_id]
    forwarded_edges: list[str] = []
    switches = 0

    for step in route.steps:
        tree = trees[tree_index]
        state = (current_node, tree_index, incoming_node)
        assert step.node_id == current_node
        assert step.tree_id == tree.tree_id

        if step.action == "loop":
            assert state in visited_states
            break
        assert state not in visited_states
        visited_states.add(state)

        if step.action == "delivered":
            assert current_node == target_node_id
            break
        if step.action == "dead_end":
            assert current_node not in tree.next_hop_by_node
            break
        if step.action == "switch":
            assert tree.edge_id_by_node[current_node] == step.edge_id
            assert step.edge_id in failed_edge_ids
            assert step.next_node_id == current_node
            tree_index = (tree_index + 1) % len(trees)
            switches += 1
            continue

        assert step.action == "forward"
        assert tree.next_hop_by_node[current_node] == step.next_node_id
        assert tree.edge_id_by_node[current_node] == step.edge_id
        assert step.edge_id not in failed_edge_ids
        incoming_node = current_node
        current_node = step.next_node_id
        forwarded_nodes.append(current_node)
        forwarded_edges.append(step.edge_id)

    assert route.node_ids == tuple(forwarded_nodes)
    assert route.edge_ids == tuple(forwarded_edges)
    assert route.switch_count == switches
    assert not set(route.edge_ids) & failed_edge_ids
    assert (route.status == "delivered") is (route.node_ids[-1] == target_node_id)
    assert (source_node_id in result.physically_unreachable_node_ids) is (
        route.status == "physically_unreachable"
    )
    assert (source_node_id in result.routing_failure_node_ids) is (
        route.status in {"dead_end", "loop"}
    )


def _topology(edge_pairs: list[tuple[str, str]]) -> Topology:
    node_ids = sorted({node for pair in edge_pairs for node in pair})
    return Topology(
        topology_id="routing-validation",
        directed=False,
        multigraph=False,
        nodes=tuple(Node(node_id) for node_id in node_ids),
        edges=tuple(
            Edge(f"e{index}", source, target)
            for index, (source, target) in enumerate(edge_pairs)
        ),
    )


def test_all_connected_simple_graphs_up_to_five_nodes_match_independent_oracle() -> None:
    graphs = _connected_simple_graphs_up_to_five_nodes()

    assert len(graphs) == 771
    checked_decompositions = 0
    for graph in graphs:
        expected = _brute_force_edge_connectivity(graph)
        actual = edge_connectivity(graph)
        assert actual == expected, graph.topology_id
        for target in graph.nodes:
            decomposition = build_greedy_arborescences(graph, target.id)
            assert decomposition.edge_connectivity == expected, graph.topology_id
            _validate_decomposition(graph, target.id, decomposition)
            checked_decompositions += 1

    assert checked_decompositions == 3_806


def test_all_failure_sets_have_consistent_routes_and_classifications() -> None:
    graphs = (
        _topology([("T", "A"), ("A", "B"), ("B", "C"), ("C", "T")]),
        _topology(
            [
                ("A", "B"),
                ("A", "C"),
                ("A", "T"),
                ("B", "C"),
                ("B", "T"),
                ("C", "T"),
            ]
        ),
        _topology([("A", "T"), ("A", "B"), ("B", "T"), ("X", "T")]),
    )

    checked_routes = 0
    for graph in graphs:
        decomposition = build_greedy_arborescences(graph, "T")
        edge_ids = tuple(edge.id for edge in graph.edges)
        for failure_count in range(len(edge_ids) + 1):
            for failed in combinations(edge_ids, failure_count):
                failed_edge_ids = frozenset(failed)
                for source in sorted(node.id for node in graph.nodes):
                    _assert_route_trace_is_consistent(
                        graph,
                        decomposition,
                        source,
                        "T",
                        failed_edge_ids,
                    )
                    checked_routes += 1

    assert checked_routes == 384
