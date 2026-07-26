"""UI-independent domain core for failover routing scenarios."""

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
    SearchResult,
    Topology,
    VisualizationState,
)
from .routing import compute_routing_result
from .search import find_first_minimal_failure
from .serialization import (
    ScenarioImport,
    export_scenario_json,
    import_scenario_json,
    scenario_from_dict,
    scenario_to_dict,
)
from .topology_import import (
    TopologyImportError,
    import_sndlib_xml_bytes,
    import_topohub_json_bytes,
    load_topology,
)
from .validation import ScenarioValidationError, validate_scenario, validate_topology

__all__ = [
    "Edge",
    "FailureState",
    "Node",
    "PathResult",
    "Position",
    "RoutingConfig",
    "RoutingResult",
    "Scenario",
    "ScenarioImport",
    "ScenarioValidationError",
    "SearchConfig",
    "SearchResult",
    "Topology",
    "TopologyImportError",
    "VisualizationState",
    "compute_routing_result",
    "export_scenario_json",
    "find_first_minimal_failure",
    "import_scenario_json",
    "import_sndlib_xml_bytes",
    "import_topohub_json_bytes",
    "load_topology",
    "scenario_from_dict",
    "scenario_to_dict",
    "validate_scenario",
    "validate_topology",
]
