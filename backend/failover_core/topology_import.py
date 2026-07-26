from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .models import Edge, Node, Position, Topology
from .validation import ScenarioValidationError, validate_topology

DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


@dataclass(frozen=True, slots=True)
class TopologyImportError(ValueError):
    message: str

    def __str__(self) -> str:
        return self.message


def _read_bytes(path: Path, max_file_size_bytes: int) -> bytes:
    try:
        size = path.stat().st_size
    except OSError as error:
        raise TopologyImportError(f"cannot access topology file: {error}") from error
    if size > max_file_size_bytes:
        raise TopologyImportError(
            f"topology file exceeds the {max_file_size_bytes}-byte size limit"
        )
    try:
        return path.read_bytes()
    except OSError as error:
        raise TopologyImportError(f"cannot read topology file: {error}") from error


def _identifier(value: Any, field: str) -> str:
    if value is None or isinstance(value, (dict, list)):
        raise TopologyImportError(f"{field} must be a scalar identifier")
    identifier = str(value).strip()
    if not identifier:
        raise TopologyImportError(f"{field} must not be empty")
    return identifier


def _finite_number(value: Any, field: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as error:
        raise TopologyImportError(f"{field} must be numeric") from error
    if number != number or number in (float("inf"), float("-inf")):
        raise TopologyImportError(f"{field} must be finite")
    return number


def _json_attributes(
    values: Mapping[str, Any], excluded: set[str]
) -> dict[str, Any]:
    return {key: value for key, value in values.items() if key not in excluded}


def _position_from_json(node: Mapping[str, Any]) -> Position | None:
    position = node.get("pos")
    if isinstance(position, list) and len(position) >= 2:
        return Position(
            _finite_number(position[0], "node.pos[0]"),
            _finite_number(position[1], "node.pos[1]"),
        )
    if "x" in node and "y" in node:
        return Position(
            _finite_number(node["x"], "node.x"),
            _finite_number(node["y"], "node.y"),
        )
    if "Longitude" in node and "Latitude" in node:
        return Position(
            _finite_number(node["Longitude"], "node.Longitude"),
            _finite_number(node["Latitude"], "node.Latitude"),
        )
    return None


def import_topohub_json_bytes(
    payload: bytes,
    *,
    source_name: str = "topohub.json",
) -> Topology:
    try:
        data = json.loads(payload)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise TopologyImportError(f"invalid TopoHub JSON: {error}") from error
    if not isinstance(data, dict):
        raise TopologyImportError("TopoHub JSON root must be an object")

    raw_nodes = data.get("nodes")
    raw_edges = data.get("edges")
    if not isinstance(raw_nodes, list) or not isinstance(raw_edges, list):
        raise TopologyImportError(
            "TopoHub JSON must contain node-link arrays 'nodes' and 'edges'"
        )

    nodes: list[Node] = []
    for index, raw_node in enumerate(raw_nodes):
        if not isinstance(raw_node, dict):
            raise TopologyImportError(f"nodes[{index}] must be an object")
        node_id = _identifier(raw_node.get("id"), f"nodes[{index}].id")
        label_value = raw_node.get("name", raw_node.get("label"))
        label = str(label_value) if label_value is not None else None
        nodes.append(
            Node(
                id=node_id,
                label=label,
                position=_position_from_json(raw_node),
                attributes=_json_attributes(
                    raw_node,
                    {"id", "name", "label", "pos", "x", "y", "Longitude", "Latitude"},
                ),
            )
        )

    edges: list[Edge] = []
    generated_ids: dict[tuple[str, str], int] = {}
    for index, raw_edge in enumerate(raw_edges):
        if not isinstance(raw_edge, dict):
            raise TopologyImportError(f"edges[{index}] must be an object")
        source = _identifier(raw_edge.get("source"), f"edges[{index}].source")
        target = _identifier(raw_edge.get("target"), f"edges[{index}].target")
        raw_id = raw_edge.get("id", raw_edge.get("key"))
        if raw_id is None:
            pair = (source, target)
            ordinal = generated_ids.get(pair, 0)
            generated_ids[pair] = ordinal + 1
            edge_id = f"{source}--{target}--{ordinal}"
        else:
            edge_id = _identifier(raw_id, f"edges[{index}].id")

        weight_field = next(
            (name for name in ("weight", "dist", "cost") if name in raw_edge),
            None,
        )
        weight = (
            _finite_number(raw_edge[weight_field], f"edges[{index}].{weight_field}")
            if weight_field is not None
            else 1.0
        )
        edges.append(
            Edge(
                id=edge_id,
                source=source,
                target=target,
                weight=weight,
                attributes=_json_attributes(
                    raw_edge,
                    {"id", "key", "source", "target", "weight", "dist", "cost"},
                ),
            )
        )

    graph_data = data.get("graph")
    graph = graph_data if isinstance(graph_data, dict) else {}
    name_value = graph.get("name")
    name = str(name_value) if name_value is not None else Path(source_name).stem
    topology = Topology(
        topology_id=name,
        name=name,
        source=f"TopoHub JSON: {source_name}",
        directed=bool(data.get("directed", False)),
        multigraph=bool(data.get("multigraph", False)),
        nodes=tuple(nodes),
        edges=tuple(edges),
    )
    try:
        validate_topology(topology)
    except ScenarioValidationError as error:
        raise TopologyImportError(str(error)) from error
    return topology


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _children_by_name(element: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in element.iter() if _local_name(child.tag) == name]


def _child_text(element: ET.Element, name: str) -> str | None:
    for child in element.iter():
        if _local_name(child.tag) == name and child.text is not None:
            return child.text.strip()
    return None


def import_sndlib_xml_bytes(
    payload: bytes,
    *,
    source_name: str = "sndlib.xml",
    directed: bool = False,
) -> Topology:
    upper_payload = payload.upper()
    if b"<!DOCTYPE" in upper_payload or b"<!ENTITY" in upper_payload:
        raise TopologyImportError("DTD and entity declarations are not supported")
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as error:
        raise TopologyImportError(f"invalid SNDlib XML: {error}") from error
    if _local_name(root.tag) != "network":
        raise TopologyImportError("SNDlib XML root element must be 'network'")

    nodes: list[Node] = []
    for index, element in enumerate(_children_by_name(root, "node")):
        node_id = _identifier(element.get("id"), f"node[{index}].id")
        x_text = _child_text(element, "x")
        y_text = _child_text(element, "y")
        position = (
            Position(
                _finite_number(x_text, f"node[{index}].x"),
                _finite_number(y_text, f"node[{index}].y"),
            )
            if x_text is not None and y_text is not None
            else None
        )
        nodes.append(Node(id=node_id, label=node_id, position=position))

    edges: list[Edge] = []
    for index, element in enumerate(_children_by_name(root, "link")):
        source = _identifier(_child_text(element, "source"), f"link[{index}].source")
        target = _identifier(_child_text(element, "target"), f"link[{index}].target")
        edge_id = _identifier(
            element.get("id", f"{source}--{target}--{index}"),
            f"link[{index}].id",
        )
        cost_text = _child_text(element, "cost")
        weight = (
            _finite_number(cost_text, f"link[{index}].cost")
            if cost_text is not None
            else 1.0
        )
        capacity_text = _child_text(element, "capacity")
        attributes: dict[str, Any] = {}
        if capacity_text is not None:
            attributes["capacity"] = _finite_number(
                capacity_text, f"link[{index}].capacity"
            )
        edges.append(Edge(edge_id, source, target, weight, attributes))

    name = Path(source_name).stem
    endpoint_pairs = {
        (edge.source, edge.target)
        if directed
        else tuple(sorted((edge.source, edge.target)))
        for edge in edges
    }
    topology = Topology(
        topology_id=name,
        name=name,
        source=f"SNDlib XML: {source_name}",
        directed=directed,
        multigraph=len(endpoint_pairs) != len(edges),
        nodes=tuple(nodes),
        edges=tuple(edges),
    )
    try:
        validate_topology(topology)
    except ScenarioValidationError as error:
        raise TopologyImportError(str(error)) from error
    return topology


def load_topology(
    file_path: str | Path,
    *,
    max_file_size_bytes: int = DEFAULT_MAX_FILE_SIZE_BYTES,
    sndlib_directed: bool = False,
) -> Topology:
    path = Path(file_path)
    payload = _read_bytes(path, max_file_size_bytes)
    suffix = path.suffix.lower()
    if suffix == ".json":
        return import_topohub_json_bytes(payload, source_name=path.name)
    if suffix == ".xml":
        return import_sndlib_xml_bytes(
            payload,
            source_name=path.name,
            directed=sndlib_directed,
        )
    raise TopologyImportError(
        f"unsupported topology format '{suffix or '<none>'}'; "
        "supported formats are TopoHub JSON (.json) and SNDlib XML (.xml)"
    )
