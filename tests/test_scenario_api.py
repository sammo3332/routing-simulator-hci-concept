"""Scenario export and import through the HTTP API."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.api import SessionStore, create_app
from backend.failover_core.serialization import (
    import_scenario_json,
    scenario_from_dict,
)
from backend.failover_core.validation import (
    ScenarioFormatVersionError,
    ScenarioValidationError,
)

FIXTURES = Path(__file__).parent / "fixtures"


def new_client() -> TestClient:
    """A fresh application with an empty store, like a restarted backend."""
    return TestClient(create_app(SessionStore()))


def import_topology(client: TestClient, filename: str) -> dict:
    response = client.post(
        f"/api/sessions/import?filename={filename}",
        content=(FIXTURES / filename).read_bytes(),
        headers={"Content-Type": "application/octet-stream"},
    )
    assert response.status_code == 200
    return response.json()


def configure(client: TestClient, session_id: str, **patch) -> dict:
    response = client.patch(f"/api/sessions/{session_id}", json=patch)
    assert response.status_code == 200, response.text
    return response.json()


def export(client: TestClient, session_id: str) -> dict:
    response = client.get(f"/api/sessions/{session_id}/scenario")
    assert response.status_code == 200
    return response.json()


def load(client: TestClient, scenario: dict | str | bytes):
    payload = (
        scenario
        if isinstance(scenario, bytes)
        else scenario.encode("utf-8")
        if isinstance(scenario, str)
        else json.dumps(scenario).encode("utf-8")
    )
    return client.post(
        "/api/sessions/import-scenario",
        content=payload,
        headers={"Content-Type": "application/json"},
    )


def domain_state(session: dict) -> dict:
    """Everything that must survive export and import."""
    return {
        "topology": session["topology"],
        "routing": session["routing"],
        "failures": session["failures"],
        "result": session["result"],
    }


def shortest_path_session(client: TestClient) -> dict:
    session = import_topology(client, "topohub_mini.json")
    edge_ids = [edge["id"] for edge in session["topology"]["edges"]]
    return configure(
        client,
        session["session_id"],
        target_node_id="2",
        weight_mode="edge_weight",
        failed_edge_ids=[edge_ids[1]],
    )


def bonsai_session(client: TestClient) -> dict:
    session = import_topology(client, "bonsai_routing_failure.json")
    return configure(
        client,
        session["session_id"],
        target_node_id="T",
        strategy="bonsai_greedy",
        failed_edge_ids=["a"],
    )


def test_exported_scenario_is_schema_valid_and_complete() -> None:
    client = new_client()
    session = shortest_path_session(client)

    scenario = export(client, session["session_id"])

    scenario_from_dict(scenario)  # raises on schema or semantic errors
    assert scenario["format_version"] == "1.0"
    assert scenario["routing"]["target_node_id"] == "2"
    assert scenario["routing"]["weight_mode"] == "edge_weight"
    assert scenario["failures"]["failed_edge_ids"] == session["failures"]["failed_edge_ids"]
    assert len(scenario["topology"]["nodes"]) == 4
    assert len(scenario["topology"]["edges"]) == 4
    assert "routing_snapshot" in scenario
    # Geographic coordinates of the import stay untouched.
    berlin = next(n for n in scenario["topology"]["nodes"] if n["id"] == "0")
    assert berlin["position"] == {"x": 13.405, "y": 52.52}


def test_shortest_path_roundtrip_restores_domain_state_after_restart() -> None:
    first = new_client()
    original = shortest_path_session(first)
    scenario_text = json.dumps(export(first, original["session_id"]))

    restarted = new_client()
    response = load(restarted, scenario_text)

    assert response.status_code == 200, response.text
    restored = response.json()
    assert restored["session_id"] != original["session_id"]
    assert domain_state(restored) == domain_state(original)
    assert restored["scenario"]["snapshot"] == "matches"
    assert restored["result"]["changed_node_ids"]


def test_bonsai_roundtrip_restores_trees_routes_and_failure_classes() -> None:
    first = new_client()
    original = bonsai_session(first)
    assert original["result"]["bonsai"]["routing_failure_node_ids"] == ["A"]
    scenario = export(first, original["session_id"])

    restored = load(new_client(), scenario).json()

    assert domain_state(restored) == domain_state(original)
    assert restored["routing"]["strategy"] == "bonsai_greedy"
    assert restored["result"]["bonsai"] == original["result"]["bonsai"]


def test_restored_session_can_be_changed_like_an_imported_topology() -> None:
    first = new_client()
    scenario = export(first, bonsai_session(first)["session_id"])
    client = new_client()
    restored = load(client, scenario).json()

    repaired = configure(client, restored["session_id"], failed_edge_ids=[])
    search = client.post(
        f"/api/sessions/{restored['session_id']}/critical-failure-search",
        json={"max_k": 1},
    )

    assert repaired["result"]["bonsai"]["routing_failure_node_ids"] == []
    assert search.status_code == 200
    assert search.json()["status"] == "found"


def test_stored_results_are_recomputed_and_not_trusted() -> None:
    first = new_client()
    original = shortest_path_session(first)
    scenario = export(first, original["session_id"])
    scenario["routing_snapshot"]["affected_node_ids"] = ["0", "1", "3"]
    scenario["routing_snapshot"]["current_paths"] = {
        node_id: None for node_id in scenario["routing_snapshot"]["current_paths"]
    }

    restored = load(new_client(), scenario).json()

    assert restored["scenario"]["snapshot"] == "differs"
    assert restored["result"] == original["result"]


def test_scenario_without_snapshot_is_accepted_and_computed() -> None:
    first = new_client()
    original = shortest_path_session(first)
    scenario = export(first, original["session_id"])
    del scenario["routing_snapshot"]

    restored = load(new_client(), scenario).json()

    assert restored["scenario"]["snapshot"] == "absent"
    assert restored["result"] == original["result"]


@pytest.mark.parametrize(
    ("mutate", "code", "expected_text"),
    [
        (lambda s: s.pop("format_version"), "missing_format_version", "keine Formatversion"),
        (lambda s: s.update(format_version="2.0"), "unsupported_format_version", "„2.0“"),
        (lambda s: s.update(format_version=1), "unsupported_format_version", "nicht unterstützt"),
        (lambda s: s["failures"].update(failed_edge_ids=["gibt-es-nicht"]), "invalid_scenario", "ungültig"),
        (lambda s: s["routing"].update(target_node_id="gibt-es-nicht"), "invalid_scenario", "ungültig"),
        (lambda s: s["routing"].update(strategy="round_robin"), "invalid_scenario", "ungültig"),
        (lambda s: s["topology"].pop("nodes"), "invalid_scenario", "ungültig"),
        (lambda s: s.update(unbekannt=True), "invalid_scenario", "ungültig"),
    ],
)
def test_invalid_scenarios_are_rejected_with_a_clear_reason(
    mutate, code: str, expected_text: str
) -> None:
    first = new_client()
    scenario = export(first, shortest_path_session(first)["session_id"])
    mutate(scenario)

    response = load(new_client(), scenario)

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == code
    assert expected_text in body["detail"]


@pytest.mark.parametrize(
    "payload",
    [b"kein json", b"\xff\xfe\x00", b"[1, 2, 3]", b'{"format_version": NaN}', b""],
)
def test_files_that_are_not_scenarios_are_rejected(payload: bytes) -> None:
    response = load(new_client(), payload)

    assert response.status_code == 422
    assert response.json()["code"] in {"invalid_json", "invalid_scenario", "missing_format_version"}
    assert response.json()["detail"]


def test_topology_file_is_not_mistaken_for_a_scenario() -> None:
    response = load(new_client(), (FIXTURES / "topohub_mini.json").read_bytes())

    assert response.status_code == 422
    assert response.json()["code"] == "missing_format_version"
    assert "Topologie laden" in response.json()["detail"]


def test_scenario_file_is_not_accepted_as_topology() -> None:
    client = new_client()
    scenario = export(client, shortest_path_session(client)["session_id"])

    response = client.post(
        "/api/sessions/import?filename=szenario.json",
        content=json.dumps(scenario).encode("utf-8"),
        headers={"Content-Type": "application/octet-stream"},
    )

    assert response.status_code == 422


def test_bonsai_scenario_on_unsuitable_topology_is_rejected() -> None:
    first = new_client()
    scenario = export(first, bonsai_session(first)["session_id"])
    scenario["failures"]["failed_edge_ids"] = []
    scenario["topology"]["edges"] = [
        edge for edge in scenario["topology"]["edges"] if edge["id"] != "d"
    ]
    scenario.pop("routing_snapshot")

    response = load(new_client(), scenario)

    assert response.status_code == 422
    assert response.json()["code"] == "invalid_scenario"


def test_oversized_scenario_is_rejected() -> None:
    response = load(new_client(), b" " * (10 * 1024 * 1024 + 1))

    assert response.status_code == 413
    assert response.json()["code"] == "file_too_large"


def test_failed_import_leaves_existing_session_untouched() -> None:
    store = SessionStore()
    client = TestClient(create_app(store))
    original = shortest_path_session(client)
    scenario = export(client, original["session_id"])
    scenario["failures"]["failed_edge_ids"] = ["gibt-es-nicht"]
    sessions_before = dict(store._sessions)

    response = load(client, scenario)

    assert response.status_code == 422
    assert store._sessions == sessions_before
    unchanged = configure(client, original["session_id"])
    assert domain_state(unchanged) == domain_state(original)


def test_export_of_unknown_session_is_reported() -> None:
    assert new_client().get("/api/sessions/unbekannt/scenario").status_code == 404


def test_core_distinguishes_missing_and_unsupported_versions() -> None:
    with pytest.raises(ScenarioFormatVersionError) as missing:
        import_scenario_json("{}")
    with pytest.raises(ScenarioFormatVersionError) as unsupported:
        import_scenario_json('{"format_version": "0.9"}')

    assert missing.value.found is None
    assert unsupported.value.found == "0.9"
    assert isinstance(missing.value, ScenarioValidationError)


def test_roundtrip_keeps_node_and_edge_order_of_the_topology() -> None:
    first = new_client()
    original = import_topology(first, "bonsai_routing_failure.json")
    scenario = export(first, original["session_id"])

    restored = load(new_client(), scenario).json()

    assert [n["id"] for n in original["topology"]["nodes"]] == ["T", "A", "B", "X"]
    assert restored["topology"]["nodes"] == original["topology"]["nodes"]
    assert restored["topology"]["edges"] == original["topology"]["edges"]
