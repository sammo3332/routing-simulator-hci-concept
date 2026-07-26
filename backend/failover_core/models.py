from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Mapping

WeightMode = Literal["hop_count", "edge_weight"]
FailureOrigin = Literal["manual", "automatic_search", "import"]
SearchStatus = Literal["found", "not_found"]


@dataclass(frozen=True, slots=True)
class Position:
    x: float
    y: float


@dataclass(frozen=True, slots=True)
class Node:
    id: str
    label: str | None = None
    position: Position | None = None
    attributes: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Edge:
    id: str
    source: str
    target: str
    weight: float = 1.0
    attributes: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Topology:
    topology_id: str
    directed: bool
    multigraph: bool
    nodes: tuple[Node, ...]
    edges: tuple[Edge, ...]
    name: str | None = None
    source: str | None = None


@dataclass(frozen=True, slots=True)
class RoutingConfig:
    target_node_id: str
    strategy: Literal["deterministic_shortest_path"] = "deterministic_shortest_path"
    weight_mode: WeightMode = "hop_count"
    tie_breaker: Literal[
        "lexicographic_node_and_edge_id"
    ] = "lexicographic_node_and_edge_id"


@dataclass(frozen=True, slots=True)
class FailureState:
    failed_edge_ids: frozenset[str] = frozenset()
    origin: FailureOrigin = "manual"


@dataclass(frozen=True, slots=True)
class SearchConfig:
    max_k: int
    stop_on_first: Literal[True] = True


@dataclass(frozen=True, slots=True)
class VisualizationState:
    show_baseline_routes: bool = True
    show_current_routes: bool = True
    show_labels: bool = True


@dataclass(frozen=True, slots=True)
class Scenario:
    format_version: Literal["1.0"]
    scenario_id: str
    topology: Topology
    routing: RoutingConfig
    failures: FailureState
    name: str | None = None
    created_at: str | None = None
    search_configuration: SearchConfig | None = None
    visualization: VisualizationState | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class PathResult:
    node_ids: tuple[str, ...]
    edge_ids: tuple[str, ...]
    total_weight: float


@dataclass(frozen=True, slots=True)
class RoutingResult:
    baseline_paths: Mapping[str, PathResult | None]
    current_paths: Mapping[str, PathResult | None]
    affected_node_ids: tuple[str, ...]
    changed_node_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class SearchResult:
    status: SearchStatus
    failed_edge_ids: tuple[str, ...] | None
    affected_node_ids: tuple[str, ...]
    tested_combinations: int
    found_at_k: int | None
    routing_result: RoutingResult | None
