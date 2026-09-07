from __future__ import annotations

from dataclasses import dataclass

from .models import Scenario, Topology


@dataclass(frozen=True, slots=True)
class ScenarioValidationError(ValueError):
    errors: tuple[str, ...]

    def __str__(self) -> str:
        return "Invalid scenario: " + "; ".join(self.errors)


def _topology_errors(topology: Topology) -> list[str]:
    errors: list[str] = []
    if not topology.topology_id.strip():
        errors.append("topology.topology_id must not be empty")
    if not topology.nodes:
        errors.append("topology.nodes must contain at least one node")

    node_ids = [node.id for node in topology.nodes]
    edge_ids = [edge.id for edge in topology.edges]
    node_id_set = set(node_ids)
    edge_id_set = set(edge_ids)

    if any(not node_id.strip() for node_id in node_ids):
        errors.append("node IDs must not be empty")
    if len(node_ids) != len(node_id_set):
        errors.append("node IDs must be unique")
    if any(not edge_id.strip() for edge_id in edge_ids):
        errors.append("edge IDs must not be empty")
    if len(edge_ids) != len(edge_id_set):
        errors.append("edge IDs must be unique")

    for edge in topology.edges:
        if edge.source not in node_id_set:
            errors.append(f"edge '{edge.id}' references unknown source '{edge.source}'")
        if edge.target not in node_id_set:
            errors.append(f"edge '{edge.id}' references unknown target '{edge.target}'")
        if edge.weight < 0:
            errors.append(f"edge '{edge.id}' has a negative weight")
    return errors


def validate_topology(topology: Topology) -> None:
    errors = _topology_errors(topology)
    if errors:
        raise ScenarioValidationError(tuple(errors))


def validate_scenario(scenario: Scenario) -> None:
    errors: list[str] = []
    topology = scenario.topology

    if scenario.format_version != "1.0":
        errors.append("format_version must be '1.0'")
    if not scenario.scenario_id.strip():
        errors.append("scenario_id must not be empty")
    errors.extend(_topology_errors(topology))

    node_id_set = {node.id for node in topology.nodes}
    edge_id_set = {edge.id for edge in topology.edges}

    if scenario.routing.target_node_id not in node_id_set:
        errors.append(
            f"routing target '{scenario.routing.target_node_id}' does not exist"
        )
    if scenario.routing.strategy not in {
        "deterministic_shortest_path",
        "bonsai_greedy",
    }:
        errors.append("unsupported routing strategy")
    if scenario.routing.weight_mode not in {"hop_count", "edge_weight"}:
        errors.append("unsupported weight_mode")

    unknown_failures = sorted(scenario.failures.failed_edge_ids - edge_id_set)
    if unknown_failures:
        errors.append(
            "failed_edge_ids contain unknown IDs: " + ", ".join(unknown_failures)
        )

    if scenario.search_configuration is not None:
        max_k = scenario.search_configuration.max_k
        if max_k < 1:
            errors.append("search_configuration.max_k must be at least 1")
        if max_k > len(topology.edges):
            errors.append(
                "search_configuration.max_k must not exceed the number of edges"
            )

    if errors:
        raise ScenarioValidationError(tuple(errors))
