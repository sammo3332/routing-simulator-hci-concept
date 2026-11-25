"""Optional display state stored with a scenario."""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from backend.failover_core.serialization import scenario_from_dict
from tests.test_scenario_api import (
    domain_state,
    export,
    load,
    new_client,
    shortest_path_session,
)

VIEW = {
    "show_labels": True,
    "node_display_positions": {"1": {"x": 120.5, "y": 300.0}},
}


def export_with_view(client: TestClient, session_id: str, view: dict | None) -> dict:
    response = client.post(
        f"/api/sessions/{session_id}/scenario", json={"visualization": view}
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_view_state_is_stored_separately_from_topology_coordinates() -> None:
    client = new_client()
    session = shortest_path_session(client)
    plain = export(client, session["session_id"])

    scenario = export_with_view(client, session["session_id"], VIEW)

    scenario_from_dict(scenario)
    assert scenario["visualization"]["show_labels"] is True
    assert scenario["visualization"]["node_display_positions"] == VIEW["node_display_positions"]
    # Imported geographic coordinates are identical with and without view state.
    assert scenario["topology"] == plain["topology"]
    dortmund = next(n for n in scenario["topology"]["nodes"] if n["id"] == "1")
    assert dortmund["position"] == {"x": 7.465, "y": 51.514}


def test_view_state_roundtrip_does_not_change_domain_state() -> None:
    first = new_client()
    original = shortest_path_session(first)
    scenario = export_with_view(first, original["session_id"], VIEW)

    restored = load(new_client(), scenario).json()

    assert domain_state(restored) == domain_state(original)
    assert restored["scenario"]["visualization"] == VIEW
    assert restored["scenario"]["snapshot"] == "matches"


def test_scenario_without_view_state_reports_none() -> None:
    first = new_client()
    scenario = export(first, shortest_path_session(first)["session_id"])

    restored = load(new_client(), scenario).json()

    assert "visualization" not in scenario
    assert restored["scenario"]["visualization"] is None


def test_export_without_moved_nodes_omits_positions() -> None:
    client = new_client()
    session = shortest_path_session(client)

    scenario = export_with_view(
        client, session["session_id"], {"show_labels": False, "node_display_positions": {}}
    )

    assert scenario["visualization"] == {
        "show_baseline_routes": True,
        "show_current_routes": True,
        "show_labels": False,
    }


def test_display_positions_for_unknown_nodes_are_rejected() -> None:
    client = new_client()
    session = shortest_path_session(client)
    bad_view = {"show_labels": False, "node_display_positions": {"nope": {"x": 1, "y": 2}}}

    on_export = client.post(
        f"/api/sessions/{session['session_id']}/scenario",
        json={"visualization": bad_view},
    )
    scenario = export_with_view(client, session["session_id"], VIEW)
    scenario["visualization"]["node_display_positions"] = bad_view["node_display_positions"]
    on_import = load(new_client(), scenario)

    assert on_export.status_code == 422
    assert on_import.status_code == 422
    assert on_import.json()["code"] == "invalid_scenario"


def test_malformed_view_state_is_rejected() -> None:
    client = new_client()
    session = shortest_path_session(client)
    scenario = export_with_view(client, session["session_id"], VIEW)
    scenario["visualization"]["node_display_positions"]["1"] = {"x": "links"}

    on_import = load(new_client(), json.dumps(scenario))
    on_export = client.post(
        f"/api/sessions/{session['session_id']}/scenario",
        json={"visualization": {"node_display_positions": {"1": {"x": 1}}}},
    )

    assert on_import.status_code == 422
    assert on_export.status_code == 422


def test_display_positions_far_outside_the_drawing_area_are_rejected() -> None:
    client = new_client()
    session = shortest_path_session(client)
    far = {"show_labels": False, "node_display_positions": {"1": {"x": 1e6, "y": 0}}}

    on_export = client.post(
        f"/api/sessions/{session['session_id']}/scenario", json={"visualization": far}
    )
    scenario = export_with_view(client, session["session_id"], VIEW)
    scenario["visualization"]["node_display_positions"] = far["node_display_positions"]
    on_import = load(new_client(), scenario)

    assert on_export.status_code == 422
    assert on_import.status_code == 422
