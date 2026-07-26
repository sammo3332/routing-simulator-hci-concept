from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from backend.api import SessionStore, create_app

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
