from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.api import SessionStore, create_app
from backend.failover_core.models import Edge, Node, Topology

FIXTURES = Path(__file__).parent / "fixtures"


def client() -> TestClient:
    return TestClient(create_app(SessionStore()))


def import_fixture(test_client: TestClient, filename: str) -> dict:
    response = test_client.post(
        f"/api/sessions/import?filename={filename}",
        content=(FIXTURES / filename).read_bytes(),
        headers={"Content-Type": "application/octet-stream"},
    )
    assert response.status_code == 200
    return response.json()


def test_health_endpoint() -> None:
    response = client().get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_import_creates_in_memory_session_and_returns_real_routing() -> None:
    data = import_fixture(client(), "topohub_mini.json")

    assert data["session_id"]
    assert data["topology"]["topology_id"] == "topohub-mini"
    assert data["result"]["node_count"] == 4
    assert data["result"]["reachable_node_count"] == 4
    assert data["result"]["affected_node_ids"] == []


def test_session_update_changes_target_metric_and_failures() -> None:
    test_client = client()
    imported = import_fixture(test_client, "sndlib_mini.xml")
    session_id = imported["session_id"]

    response = test_client.patch(
        f"/api/sessions/{session_id}",
        json={
            "target_node_id": "T",
            "weight_mode": "edge_weight",
            "failed_edge_ids": ["B_T"],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["routing"]["target_node_id"] == "T"
    assert data["routing"]["weight_mode"] == "edge_weight"
    assert data["failures"]["failed_edge_ids"] == ["B_T"]
    assert data["result"]["affected_node_ids"] == ["A", "B"]


def test_session_can_switch_to_bonsai_and_returns_explainable_trees() -> None:
    test_client = client()
    imported = import_fixture(test_client, "topohub_mini.json")

    response = test_client.patch(
        f"/api/sessions/{imported['session_id']}",
        json={"strategy": "bonsai_greedy"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["routing"]["strategy"] == "bonsai_greedy"
    bonsai = data["result"]["bonsai"]
    assert bonsai["edge_connectivity"] == 2
    assert [tree["tree_id"] for tree in bonsai["arborescences"]] == [
        "T1",
        "T2",
    ]
    assert all(
        len(tree["arcs"]) == data["result"]["node_count"] - 1
        for tree in bonsai["arborescences"]
    )
    assert set(bonsai["route_status_by_node"].values()) == {"delivered"}


def test_bonsai_api_search_returns_only_routing_critical_failure() -> None:
    test_client = client()
    imported = import_fixture(test_client, "bonsai_routing_failure.json")
    session_id = imported["session_id"]
    switched = test_client.patch(
        f"/api/sessions/{session_id}",
        json={"strategy": "bonsai_greedy", "target_node_id": "T"},
    )

    response = test_client.post(
        f"/api/sessions/{session_id}/critical-failure-search",
        json={"max_k": 1},
    )

    assert switched.status_code == 200
    assert response.status_code == 200
    data = response.json()
    assert data["failure_type"] == "routing_failure"
    assert data["failed_edge_ids"] == ["a"]
    assert "A" in data["affected_node_ids"]
    assert data["result"]["bonsai"]["route_status_by_node"]["A"] == "loop"


def test_invalid_update_does_not_corrupt_session() -> None:
    test_client = client()
    imported = import_fixture(test_client, "sndlib_mini.xml")
    session_id = imported["session_id"]

    invalid = test_client.patch(
        f"/api/sessions/{session_id}",
        json={"target_node_id": "missing"},
    )
    valid = test_client.patch(
        f"/api/sessions/{session_id}",
        json={"target_node_id": "T"},
    )

    assert invalid.status_code == 422
    assert valid.status_code == 200
    assert valid.json()["routing"]["target_node_id"] == "T"


def test_invalid_bonsai_switch_is_atomic_and_decomposition_is_cached() -> None:
    store = SessionStore()
    directed = Topology(
        topology_id="directed",
        directed=True,
        multigraph=False,
        nodes=(Node("A"), Node("T")),
        edges=(Edge("a", "A", "T"),),
    )
    directed_session = store.create(directed)

    with pytest.raises(ValueError, match="undirected"):
        store.update(directed_session.session_id, strategy="bonsai_greedy")

    assert store.get(directed_session.session_id).routing.strategy == (
        "deterministic_shortest_path"
    )

    undirected = Topology(
        topology_id="cycle",
        directed=False,
        multigraph=False,
        nodes=(Node("A"), Node("B"), Node("T")),
        edges=(
            Edge("a", "A", "T"),
            Edge("b", "A", "B"),
            Edge("c", "B", "T"),
        ),
    )
    session = store.create(undirected)
    switched = store.update(
        session.session_id, strategy="bonsai_greedy", target_node_id="T"
    )
    updated = store.update(
        session.session_id, failed_edge_ids=frozenset({"a"})
    )

    assert switched.bonsai_decomposition is updated.bonsai_decomposition


def test_unknown_session_and_unsupported_format_are_reported() -> None:
    test_client = client()

    missing = test_client.patch(
        "/api/sessions/not-there",
        json={"failed_edge_ids": []},
    )
    unsupported = test_client.post(
        "/api/sessions/import?filename=topology.gml",
        content=b"graph []",
    )

    assert missing.status_code == 404
    assert unsupported.status_code == 415


def test_critical_failure_search_finds_first_minimal_set_without_mutating_session() -> None:
    test_client = client()
    imported = import_fixture(test_client, "topohub_mini.json")
    session_id = imported["session_id"]

    response = test_client.post(
        f"/api/sessions/{session_id}/critical-failure-search",
        json={"max_k": 2},
    )
    session_after_search = test_client.patch(
        f"/api/sessions/{session_id}",
        json={},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "found"
    assert data["max_k"] == 2
    assert data["found_at_k"] == 2
    assert len(data["failed_edge_ids"]) == 2
    assert data["affected_node_ids"]
    assert data["result"]["reachable_node_count"] < data["result"]["node_count"]
    assert session_after_search.status_code == 200
    assert session_after_search.json()["failures"]["failed_edge_ids"] == []


def test_critical_failure_search_reports_not_found_within_limit() -> None:
    test_client = client()
    imported = import_fixture(test_client, "topohub_mini.json")
    session_id = imported["session_id"]

    response = test_client.post(
        f"/api/sessions/{session_id}/critical-failure-search",
        json={"max_k": 1},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "not_found",
        "max_k": 1,
        "tested_combinations": 4,
        "found_at_k": None,
        "failed_edge_ids": None,
        "affected_node_ids": [],
        "result": None,
    }


def test_critical_failure_search_validates_limit_and_session() -> None:
    test_client = client()
    imported = import_fixture(test_client, "sndlib_mini.xml")
    session_id = imported["session_id"]

    zero = test_client.post(
        f"/api/sessions/{session_id}/critical-failure-search",
        json={"max_k": 0},
    )
    above_edge_count = test_client.post(
        f"/api/sessions/{session_id}/critical-failure-search",
        json={"max_k": 3},
    )
    missing = test_client.post(
        "/api/sessions/not-there/critical-failure-search",
        json={"max_k": 1},
    )

    assert zero.status_code == 422
    assert above_edge_count.status_code == 422
    assert above_edge_count.json()["detail"] == (
        "max_k must not exceed the number of edges"
    )
    assert missing.status_code == 404
