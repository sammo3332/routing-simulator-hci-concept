from __future__ import annotations

from pathlib import Path

import pytest

from backend.failover_core.models import RoutingConfig
from backend.failover_core.routing import compute_routing_result
from backend.failover_core.topology_import import (
    TopologyImportError,
    import_sndlib_xml_bytes,
    import_topohub_json_bytes,
    load_topology,
)

FIXTURES = Path(__file__).parent / "fixtures"


def test_loads_topohub_node_link_json_with_positions_and_distances() -> None:
    topology = load_topology(FIXTURES / "topohub_mini.json")

    assert topology.topology_id == "topohub-mini"
    assert topology.directed is False
    assert topology.multigraph is False
    assert len(topology.nodes) == 4
    assert len(topology.edges) == 4
    assert topology.nodes[0].id == "0"
    assert topology.nodes[0].label == "Berlin"
    assert topology.nodes[0].position.x == pytest.approx(13.405)
    assert topology.edges[0].id == "0--1--0"
    assert topology.edges[0].weight == pytest.approx(421.5)


def test_topohub_imported_topology_works_with_routing_core() -> None:
    topology = load_topology(FIXTURES / "topohub_mini.json")
    config = RoutingConfig(target_node_id="2", weight_mode="edge_weight")

    result = compute_routing_result(topology, config)

    assert result.current_paths["0"].node_ids == ("0", "1", "2")
    assert result.current_paths["0"].total_weight == pytest.approx(642.5)


def test_loads_sndlib_xml_with_coordinates_capacity_and_cost() -> None:
    topology = load_topology(FIXTURES / "sndlib_mini.xml")

    assert topology.topology_id == "sndlib_mini"
    assert topology.directed is False
    assert tuple(node.id for node in topology.nodes) == ("A", "B", "T")
    assert topology.nodes[0].position.x == pytest.approx(7.0)
    assert topology.edges[0].id == "A_B"
    assert topology.edges[0].weight == pytest.approx(2.0)
    assert topology.edges[0].attributes["capacity"] == pytest.approx(100.0)


def test_sndlib_routing_cost_takes_precedence_over_module_cost() -> None:
    payload = b"""<?xml version="1.0"?>
    <network xmlns="http://sndlib.zib.de/network">
      <networkStructure>
        <nodes>
          <node id="A"/>
          <node id="T"/>
        </nodes>
        <links>
          <link id="A_T">
            <source>A</source>
            <target>T</target>
            <routingCost>7.5</routingCost>
            <preInstalledModule>
              <capacity>100.0</capacity>
              <cost>0.0</cost>
            </preInstalledModule>
          </link>
        </links>
      </networkStructure>
    </network>
    """

    topology = import_sndlib_xml_bytes(payload)

    assert topology.edges[0].weight == pytest.approx(7.5)


def test_topohub_parallel_edges_receive_unique_stable_ids() -> None:
    payload = b"""
    {
      "directed": false,
      "multigraph": true,
      "graph": {"name": "parallel"},
      "nodes": [{"id": "A"}, {"id": "T"}],
      "edges": [
        {"source": "A", "target": "T"},
        {"source": "A", "target": "T"}
      ]
    }
    """

    topology = import_topohub_json_bytes(payload)

    assert tuple(edge.id for edge in topology.edges) == (
        "A--T--0",
        "A--T--1",
    )


def test_import_rejects_edge_with_unknown_node() -> None:
    payload = b"""
    {
      "directed": false,
      "multigraph": false,
      "nodes": [{"id": "A"}],
      "edges": [{"source": "A", "target": "missing"}]
    }
    """

    with pytest.raises(TopologyImportError, match="unknown target"):
        import_topohub_json_bytes(payload)


def test_import_rejects_xml_entities() -> None:
    payload = b"""<?xml version="1.0"?>
    <!DOCTYPE network [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
    <network><nodes><node id="&xxe;"/></nodes></network>
    """

    with pytest.raises(TopologyImportError, match="DTD and entity"):
        import_sndlib_xml_bytes(payload)


def test_load_rejects_unsupported_extension(tmp_path: Path) -> None:
    path = tmp_path / "topology.gml"
    path.write_text("graph []", encoding="utf-8")

    with pytest.raises(TopologyImportError, match="supported formats"):
        load_topology(path)


def test_load_enforces_file_size_limit() -> None:
    with pytest.raises(TopologyImportError, match="size limit"):
        load_topology(
            FIXTURES / "topohub_mini.json",
            max_file_size_bytes=10,
        )
