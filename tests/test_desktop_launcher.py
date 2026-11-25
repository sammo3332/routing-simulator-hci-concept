"""Desktop launcher: local server lifecycle and self-tests (any platform)."""

from __future__ import annotations

import json
import logging
import socket
import sys
import types
from pathlib import Path

import pytest

from desktop import launcher
from desktop.make_constraints import constraints

INDEX = (
    "<!doctype html><title>Failover Routing Visualizer</title>"
    '<script type="module" src="/assets/app.js"></script>'
)


@pytest.fixture
def frontend(tmp_path: Path) -> Path:
    directory = tmp_path / "frontend"
    (directory / "assets").mkdir(parents=True)
    (directory / "index.html").write_text(INDEX, encoding="utf-8")
    (directory / "assets" / "app.js").write_text("console.log('ok')", encoding="utf-8")
    return directory


@pytest.fixture(autouse=True)
def restore_logging():
    root = logging.getLogger()
    handlers, level = list(root.handlers), root.level
    yield
    for handler in list(root.handlers):
        if handler not in handlers:
            root.removeHandler(handler)
            handler.close()
    for handler in handlers:
        if handler not in root.handlers:
            root.addHandler(handler)
    root.setLevel(level)


def port_is_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except OSError:
        return False


def port_of(url: str) -> int:
    return int(url.rstrip("/").rsplit(":", 1)[1])


def test_server_serves_frontend_and_api_on_loopback_and_stops(frontend: Path) -> None:
    server = launcher.LocalServer(frontend)
    server.start()
    try:
        assert server.bind_address == "127.0.0.1"
        assert server.url == f"http://127.0.0.1:{server.port}/"
        status, body = launcher._request(f"{server.url}api/health")
        assert (status, json.loads(body)) == (200, {"status": "ok"})
        status, body = launcher._request(server.url)
        assert status == 200 and "Failover Routing Visualizer" in body.decode("utf-8")
        assert launcher.externally_reachable(server.port) in (False, None)
    finally:
        server.stop()

    assert not server.running
    assert not port_is_open(server.port)


def test_two_instances_get_different_ports(frontend: Path) -> None:
    first = launcher.LocalServer(frontend)
    second = launcher.LocalServer(frontend)
    first.start()
    second.start()
    try:
        assert first.port != second.port
    finally:
        first.stop()
        second.stop()

    assert not port_is_open(first.port)
    assert not port_is_open(second.port)


def test_self_test_covers_frontend_import_and_both_routing_strategies(frontend: Path) -> None:
    server = launcher.LocalServer(frontend)
    server.start()
    try:
        result = launcher.smoke_test(server)
    finally:
        server.stop()

    assert result["passed"] is True
    for name in ("health", "index", "assets_local", "index_without_external_references",
                 "import", "shortest_path", "bonsai", "bound_to_loopback"):
        assert result["checks"][name] is True
    # Without the flag the self-test must not contact any public host.
    assert result["internet"] == {"probed": False, "python_reachable": None}


def test_self_test_checks_scenarios_only_when_the_api_offers_them(frontend: Path) -> None:
    server = launcher.LocalServer(frontend)
    server.start()
    try:
        status, _ = launcher._request(f"{server.url}api/sessions/x/scenario")
        result = launcher.smoke_test(server)
    finally:
        server.stop()

    scenario_checks = {"scenario_roundtrip", "scenario_schema_enforced", "scenario_version_checked"}
    if status == 404 and not result["scenario_api_present"]:
        assert not scenario_checks & set(result["checks"])
    else:
        assert scenario_checks <= set(result["checks"])
        assert all(result["checks"][name] for name in scenario_checks)


def test_local_requests_ignore_a_configured_proxy(
    frontend: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # A proxy that does not answer; without the bypass the start would time out.
    for name in ("http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY", "all_proxy", "ALL_PROXY"):
        monkeypatch.setenv(name, "http://127.0.0.1:9")
    for name in ("no_proxy", "NO_PROXY"):
        monkeypatch.setenv(name, "")
    server = launcher.LocalServer(frontend)
    server.start(timeout=10)
    try:
        result = launcher.smoke_test(server)
    finally:
        server.stop()

    assert result["passed"] is True


def test_main_runs_self_test_writes_result_and_stops_server(
    frontend: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(launcher, "frontend_directory", lambda: frontend)
    monkeypatch.setattr(launcher, "log_directory", lambda: tmp_path / "logs")
    result_file = tmp_path / "result.json"
    url_file = tmp_path / "url.txt"

    exit_code = launcher.main(
        ["--smoke-test", "--result-file", str(result_file), "--url-file", str(url_file)]
    )

    assert exit_code == 0
    assert json.loads(result_file.read_text(encoding="utf-8"))["passed"] is True
    assert not port_is_open(port_of(url_file.read_text(encoding="utf-8")))
    assert (tmp_path / "logs" / "app.log").is_file()


def test_second_start_appends_to_the_log_instead_of_truncating_it(
    frontend: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(launcher, "frontend_directory", lambda: frontend)
    monkeypatch.setattr(launcher, "log_directory", lambda: tmp_path / "logs")

    assert launcher.main(["--smoke-test"]) == 0
    first = (tmp_path / "logs" / "app.log").read_text(encoding="utf-8")
    assert launcher.main(["--smoke-test"]) == 0
    second = (tmp_path / "logs" / "app.log").read_text(encoding="utf-8")

    assert first and second.startswith(first)
    assert second.count("startet (Protokoll") == 2


def test_missing_frontend_build_is_reported(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(launcher, "bundle_root", lambda: tmp_path)

    with pytest.raises(FileNotFoundError, match="npm run build"):
        launcher.frontend_directory()


def test_start_failure_returns_error_code_without_window(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(launcher, "bundle_root", lambda: tmp_path)
    monkeypatch.setattr(launcher, "log_directory", lambda: tmp_path / "logs")
    shown: list[str] = []
    monkeypatch.setattr(launcher, "_show_error", shown.append)

    assert launcher.main([]) == 1
    assert shown and "nicht gestartet" in shown[0]


def test_window_falls_back_to_browser_when_no_window_is_possible(
    frontend: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(launcher, "frontend_directory", lambda: frontend)
    monkeypatch.setattr(launcher, "log_directory", lambda: tmp_path / "logs")
    monkeypatch.setattr(launcher, "run_window", lambda url: False)
    opened: list[str] = []
    ports: list[bool] = []

    def fake_browser(url: str) -> None:
        opened.append(url)
        ports.append(port_is_open(port_of(url)))

    monkeypatch.setattr(launcher, "run_in_browser", fake_browser)

    assert launcher.main([]) == 0
    assert opened and opened[0].startswith("http://127.0.0.1:")
    assert ports == [True]
    assert not port_is_open(port_of(opened[0]))


def test_unexpected_error_while_running_stops_the_server_and_is_reported(
    frontend: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(launcher, "frontend_directory", lambda: frontend)
    monkeypatch.setattr(launcher, "log_directory", lambda: tmp_path / "logs")
    seen: list[int] = []

    def broken_window(url: str) -> bool:
        seen.append(port_of(url))
        raise RuntimeError("kaputt")

    monkeypatch.setattr(launcher, "run_window", broken_window)
    shown: list[str] = []
    monkeypatch.setattr(launcher, "_show_error", shown.append)

    assert launcher.main([]) == 1
    assert shown and "Fehler" in shown[0]
    assert not port_is_open(seen[0])
    assert "kaputt" in (tmp_path / "logs" / "app.log").read_text(encoding="utf-8")


def fake_webview(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(sys.modules, "webview", types.ModuleType("webview"))
    if sys.platform == "win32":
        monkeypatch.setattr(launcher, "webview2_runtime_available", lambda: True)


def test_window_that_never_opened_leads_to_the_browser(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_webview(monkeypatch)
    monkeypatch.setattr(launcher, "_create_window", lambda url: None)

    def failing_start(function=None, arguments=()):
        raise RuntimeError("kein Fenster")

    monkeypatch.setattr(launcher, "_start_gui", failing_start)

    assert launcher.run_window("http://127.0.0.1:1/") is False


def test_error_after_the_window_was_shown_does_not_open_the_browser(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_webview(monkeypatch)
    monkeypatch.setattr(launcher, "_create_window", lambda url: None)

    def start_then_fail(function=None, arguments=()):
        function(*arguments)  # the GUI loop was running
        raise RuntimeError("Fehler beim Schließen")

    monkeypatch.setattr(launcher, "_start_gui", start_then_fail)

    assert launcher.run_window("http://127.0.0.1:1/") is True


def test_browser_mode_without_tk_never_waits_silently(monkeypatch: pytest.MonkeyPatch) -> None:
    import webbrowser

    opened: list[str] = []
    fallback: list[str] = []
    monkeypatch.setattr(webbrowser, "open", lambda url: opened.append(url))

    def no_tk(url: str) -> None:
        raise ImportError("No module named 'tkinter'")

    monkeypatch.setattr(launcher, "_quit_window", no_tk)
    monkeypatch.setattr(launcher, "_quit_without_tk", fallback.append)

    launcher.run_in_browser("http://127.0.0.1:1/")

    assert opened == ["http://127.0.0.1:1/"]
    assert fallback == ["http://127.0.0.1:1/"]


def test_webview2_detection_is_false_outside_windows() -> None:
    if sys.platform != "win32":
        assert launcher.webview2_runtime_available() is False


def test_constraints_are_derived_from_lock_file() -> None:
    lock = "anyio==4.15.1 \\\n    --hash=sha256:abc\n# comment\nclick==8.5.0 \\\n"
    assert constraints(lock) == ["anyio==4.15.1", "click==8.5.0"]


def test_start_page_references_no_external_resources() -> None:
    index = Path(__file__).resolve().parents[1] / "index.html"
    html = index.read_text(encoding="utf-8")
    assert "http://" not in html and "https://" not in html


# --- window test: control flow with a simulated page ------------------------


class FakePage:
    """Answers the page scripts of the window test like the real interface."""

    def __init__(self, *, scenario_controls: bool, broken_load: bool = False) -> None:
        self.scenario_controls = scenario_controls
        self.broken_load = broken_load
        self.nodes = 0
        self.bonsai = False
        self.failures = 0
        self.loaded_scenario = False
        self.captured: dict | None = None
        self.capture_installed = False
        self.internet: bool | None = None
        self.scripts: list[str] = []

    def scenario(self) -> str:
        return json.dumps({
            "format_version": "1.0",
            "topology": {"nodes": [{"id": n} for n in "ABCD"]},
            "routing": {"strategy": "bonsai_greedy" if self.bonsai else "x",
                        "target_node_id": "A"},
            "failures": {"failed_edge_ids": ["ab"] if self.failures else []},
        })

    def state(self) -> str:
        status = "Failover aktiv" if self.failures else "Normalbetrieb"
        return json.dumps({
            "title": launcher.APP_NAME,
            "sidebar": True,
            "header": f"{launcher.APP_NAME} Bereit",
            "nodes": self.nodes,
            "status": status if self.nodes else "",
            "summary": f"Details Erreichbarkeit 4/4 · {self.failures} Ausfälle · 0 Routingfehler",
            "target": "A" if self.nodes else "",
            "bonsai": self.bonsai,
            "failures": self.failures if self.nodes else None,
            "loading": False,
            "hasScenario": self.scenario_controls,
            "loadedScenario": self.loaded_scenario,
            "capturedName": self.captured["name"] if self.captured else None,
            "capturedText": self.captured["text"] if self.captured else None,
            "internet": self.internet,
            "userAgent": "Fake Edg/1",
        })

    def __call__(self, script: str):
        self.scripts.append(script)
        if script == launcher.WINDOW_STATE_SCRIPT:
            return self.state()
        if script == launcher.WINDOW_CAPTURE_SCRIPT:
            self.capture_installed = True
            return "ok"
        if script == launcher.window_internet_script():
            self.internet = False
            return "gestartet"
        if script == launcher.window_import_script():
            self.nodes, self.bonsai, self.failures = 4, False, 0
            return "ok"
        if script == launcher.window_click_script("Bonsai (Greedy)"):
            self.bonsai = True
            return "ok"
        if script == launcher.window_click_script("ausfallen lassen"):
            self.failures = 1
            return "ok"
        if script == launcher.window_click_script("Alle Kanten wiederherstellen"):
            self.failures = 0
            return "ok"
        if script == launcher.window_click_script("Szenario speichern"):
            if self.capture_installed:
                self.captured = {"name": "szenario-smoke-test.json", "text": self.scenario()}
            return "ok"
        if launcher.SCENARIO_INPUT_SELECTOR.replace('"', '\\"') in script:
            if not self.broken_load:
                self.failures, self.loaded_scenario = 1, True
            return "ok"
        raise AssertionError(f"unexpected script: {script[:80]}")


def drive(page: FakePage, **options):
    return launcher.drive_window_test(
        page, sleep=lambda seconds: None, step_timeout=0.05, **options
    )


def test_window_test_covers_import_routing_and_scenario_save_and_load() -> None:
    page = FakePage(scenario_controls=True)

    checks, details = drive(page)

    assert checks == {
        "ui_rendered": True,
        "file_import_through_ui": True,
        "routing_through_ui": True,
        "scenario_saved_through_ui": True,
        "scenario_loaded_through_ui": True,
    }
    assert details["scenario_saved_via"] == "abgefangener Download"
    assert details["state_after_load"] == details["routing_state"]
    # No public host is contacted unless explicitly requested.
    assert launcher.window_internet_script() not in page.scripts


def test_window_test_skips_scenarios_when_the_interface_has_none() -> None:
    checks, details = drive(FakePage(scenario_controls=False))

    assert checks == {
        "ui_rendered": True,
        "file_import_through_ui": True,
        "routing_through_ui": True,
    }
    assert details["scenario_controls_present"] is False


def test_window_test_reports_a_scenario_that_does_not_restore_the_state() -> None:
    checks, _ = drive(FakePage(scenario_controls=True, broken_load=True))

    assert checks["scenario_saved_through_ui"] is True
    assert checks["scenario_loaded_through_ui"] is False


def test_window_test_reads_the_file_written_through_the_save_dialog(tmp_path: Path) -> None:
    page = FakePage(scenario_controls=True)
    target = tmp_path / "gespeichert.json"
    page.nodes, page.bonsai, page.failures = 4, True, 1
    target.write_text(page.scenario(), encoding="utf-8")
    page.nodes, page.bonsai, page.failures = 0, False, 0

    checks, details = drive(page, native_save_file=target)

    assert checks["scenario_saved_through_ui"] is True
    assert checks["scenario_loaded_through_ui"] is True
    assert details["scenario_saved_via"] == "Speichern-Dialog"
    assert launcher.WINDOW_CAPTURE_SCRIPT not in page.scripts


def test_window_test_probes_the_internet_only_on_request() -> None:
    page = FakePage(scenario_controls=False)

    _, details = drive(page, probe_internet=True)

    assert details["page_internet_reachable"] is False


def test_saved_scenario_must_match_the_configured_state() -> None:
    page = FakePage(scenario_controls=True)
    page.nodes, page.bonsai, page.failures = 4, True, 1
    assert launcher.scenario_text_is_expected(page.scenario()) is True
    page.failures = 0
    assert launcher.scenario_text_is_expected(page.scenario()) is False
    assert launcher.scenario_text_is_expected("kein json") is False
    assert launcher.scenario_text_is_expected(None) is False
