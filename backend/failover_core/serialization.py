from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .models import (
    Edge,
    FailureState,
    Node,
    PathResult,
    Position,
    RoutingConfig,
    RoutingResult,
    Scenario,
    SearchConfig,
    Topology,
    VisualizationState,
)
from .routing import compute_routing_result
from .validation import ScenarioValidationError, validate_scenario

SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "schemas"
    / "failover-scenario.schema.json"
)


@dataclass(frozen=True, slots=True)
class ScenarioImport:
    scenario: Scenario
    routing_result: RoutingResult
    snapshot_matches: bool | None


def _path_to_dict(path: PathResult | None) -> dict[str, Any] | None:
    if path is None:
        return None
    return {
        "node_ids": list(path.node_ids),
        "edge_ids": list(path.edge_ids),
        "total_weight": path.total_weight,
    }


def _path_map_to_dict(
    paths: Mapping[str, PathResult | None],
) -> dict[str, dict[str, Any] | None]:
    return {node_id: _path_to_dict(path) for node_id, path in sorted(paths.items())}


def _routing_snapshot_to_dict(result: RoutingResult) -> dict[str, Any]:
    return {
        "baseline_paths": _path_map_to_dict(result.baseline_paths),
        "current_paths": _path_map_to_dict(result.current_paths),
        "affected_node_ids": list(result.affected_node_ids),
        "changed_node_ids": list(result.changed_node_ids),
    }


def scenario_to_dict(
    scenario: Scenario,
    routing_result: RoutingResult | None = None,
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "format_version": scenario.format_version,
        "scenario_id": scenario.scenario_id,
        "topology": {
            "topology_id": scenario.topology.topology_id,
            "directed": scenario.topology.directed,
            "multigraph": scenario.topology.multigraph,
            "nodes": [],
            "edges": [],
        },
        "routing": {
            "strategy": scenario.routing.strategy,
            "target_node_id": scenario.routing.target_node_id,
            "weight_mode": scenario.routing.weight_mode,
            "tie_breaker": scenario.routing.tie_breaker,
        },
        "failures": {
            "failed_edge_ids": sorted(scenario.failures.failed_edge_ids),
            "origin": scenario.failures.origin,
        },
    }
    if scenario.name is not None:
        data["name"] = scenario.name
    if scenario.created_at is not None:
        data["created_at"] = scenario.created_at
    if scenario.topology.name is not None:
        data["topology"]["name"] = scenario.topology.name
    if scenario.topology.source is not None:
        data["topology"]["source"] = scenario.topology.source

    for node in sorted(scenario.topology.nodes, key=lambda item: item.id):
        node_data: dict[str, Any] = {"id": node.id}
        if node.label is not None:
            node_data["label"] = node.label
        if node.position is not None:
            node_data["position"] = {
                "x": node.position.x,
                "y": node.position.y,
            }
        if node.attributes:
            node_data["attributes"] = dict(node.attributes)
        data["topology"]["nodes"].append(node_data)

    for edge in sorted(scenario.topology.edges, key=lambda item: item.id):
        edge_data: dict[str, Any] = {
            "id": edge.id,
            "source": edge.source,
            "target": edge.target,
            "weight": edge.weight,
        }
        if edge.attributes:
            edge_data["attributes"] = dict(edge.attributes)
        data["topology"]["edges"].append(edge_data)

    if scenario.search_configuration is not None:
        data["search_configuration"] = {
            "max_k": scenario.search_configuration.max_k,
            "stop_on_first": True,
        }
    if scenario.visualization is not None:
        data["visualization"] = {
            "show_baseline_routes": scenario.visualization.show_baseline_routes,
            "show_current_routes": scenario.visualization.show_current_routes,
            "show_labels": scenario.visualization.show_labels,
        }
    if scenario.metadata:
        data["metadata"] = dict(scenario.metadata)
    if routing_result is not None:
        data["routing_snapshot"] = _routing_snapshot_to_dict(routing_result)
    return data


def _schema_errors(data: Mapping[str, Any]) -> list[str]:
    try:
        import jsonschema
    except ImportError:
        return []

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = jsonschema.Draft202012Validator(schema)
    return [
        f"{'/'.join(str(part) for part in error.absolute_path) or '<root>'}: "
        f"{error.message}"
        for error in sorted(validator.iter_errors(data), key=lambda item: list(item.path))
    ]


def scenario_from_dict(data: Mapping[str, Any]) -> Scenario:
    schema_errors = _schema_errors(data)
    if schema_errors:
        raise ScenarioValidationError(tuple(schema_errors))

    try:
        topology_data = data["topology"]
        routing_data = data["routing"]
        failure_data = data["failures"]

        nodes = tuple(
            Node(
                id=node["id"],
                label=node.get("label"),
                position=(
                    Position(
                        x=float(node["position"]["x"]),
                        y=float(node["position"]["y"]),
                    )
                    if node.get("position") is not None
                    else None
                ),
                attributes=node.get("attributes", {}),
            )
            for node in topology_data["nodes"]
        )
        edges = tuple(
            Edge(
                id=edge["id"],
                source=edge["source"],
                target=edge["target"],
                weight=float(edge.get("weight", 1)),
                attributes=edge.get("attributes", {}),
            )
            for edge in topology_data["edges"]
        )
        search_data = data.get("search_configuration")
        visualization_data = data.get("visualization")
        scenario = Scenario(
            format_version=data["format_version"],
            scenario_id=data["scenario_id"],
            name=data.get("name"),
            created_at=data.get("created_at"),
            topology=Topology(
                topology_id=topology_data["topology_id"],
                name=topology_data.get("name"),
                source=topology_data.get("source"),
                directed=bool(topology_data["directed"]),
                multigraph=bool(topology_data["multigraph"]),
                nodes=nodes,
                edges=edges,
            ),
            routing=RoutingConfig(
                strategy=routing_data["strategy"],
                target_node_id=routing_data["target_node_id"],
                weight_mode=routing_data["weight_mode"],
                tie_breaker=routing_data["tie_breaker"],
            ),
            failures=FailureState(
                failed_edge_ids=frozenset(failure_data["failed_edge_ids"]),
                origin=failure_data.get("origin", "import"),
            ),
            search_configuration=(
                SearchConfig(max_k=int(search_data["max_k"]))
                if search_data is not None
                else None
            ),
            visualization=(
                VisualizationState(
                    show_baseline_routes=visualization_data.get(
                        "show_baseline_routes", True
                    ),
                    show_current_routes=visualization_data.get(
                        "show_current_routes", True
                    ),
                    show_labels=visualization_data.get("show_labels", True),
                )
                if visualization_data is not None
                else None
            ),
            metadata=data.get("metadata", {}),
        )
    except (KeyError, TypeError, ValueError) as error:
        raise ScenarioValidationError((f"cannot construct scenario: {error}",)) from error

    validate_scenario(scenario)
    return scenario


def export_scenario_json(
    scenario: Scenario,
    routing_result: RoutingResult | None = None,
    *,
    indent: int = 2,
) -> str:
    validate_scenario(scenario)
    if routing_result is None:
        routing_result = compute_routing_result(
            scenario.topology,
            scenario.routing,
            scenario.failures.failed_edge_ids,
        )
    return json.dumps(
        scenario_to_dict(scenario, routing_result),
        indent=indent,
        sort_keys=True,
        ensure_ascii=False,
    )


def import_scenario_json(payload: str) -> ScenarioImport:
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as error:
        raise ScenarioValidationError((f"invalid JSON: {error.msg}",)) from error
    if not isinstance(data, dict):
        raise ScenarioValidationError(("scenario root must be an object",))

    scenario = scenario_from_dict(data)
    result = compute_routing_result(
        scenario.topology,
        scenario.routing,
        scenario.failures.failed_edge_ids,
    )
    snapshot = data.get("routing_snapshot")
    snapshot_matches = (
        None
        if snapshot is None
        else snapshot == _routing_snapshot_to_dict(result)
    )
    return ScenarioImport(
        scenario=scenario,
        routing_result=result,
        snapshot_matches=snapshot_matches,
    )
