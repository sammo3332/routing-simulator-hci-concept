"""Desktop launcher: local server lifecycle and self-test (any platform)."""

from __future__ import annotations

import json
import socket
import urllib.request
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
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text(INDEX, encoding="utf-8")
    (tmp_path / "assets" / "app.js").write_text("console.log('ok')", encoding="utf-8")
    return tmp_path


def port_is_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except OSError:
        return False


def test_server_serves_frontend_and_api_on_loopback_and_stops(frontend: Path) -> None:
    server = launcher.LocalServer(frontend)
    server.start()
    try:
        assert server.bind_address == "127.0.0.1"
        assert server.url == f"http://127.0.0.1:{server.port}/"
        with urllib.request.urlopen(f"{server.url}api/health", timeout=5) as response:
            assert json.loads(response.read()) == {"status": "ok"}
        with urllib.request.urlopen(server.url, timeout=5) as response:
            assert "Failover Routing Visualizer" in response.read().decode("utf-8")
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


def test_self_test_covers_frontend_import_and_bonsai(frontend: Path) -> None:
    server = launcher.LocalServer(frontend)
    server.start()
    try:
        result = launcher.smoke_test(server)
    finally:
        server.stop()

    assert result["passed"] is True
    for name in ("health", "index", "assets_local", "no_external_resources",
                 "import", "bonsai", "bound_to_loopback"):
        assert result["checks"][name] is True


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
    port = int(url_file.read_text(encoding="utf-8").rstrip("/").rsplit(":", 1)[1])
    assert not port_is_open(port)
    assert (tmp_path / "logs" / "app.log").is_file()


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
        ports.append(port_is_open(int(url.rstrip("/").rsplit(":", 1)[1])))

    monkeypatch.setattr(launcher, "run_in_browser", fake_browser)

    assert launcher.main([]) == 0
    assert opened and opened[0].startswith("http://127.0.0.1:")
    assert ports == [True]
    assert not port_is_open(int(opened[0].rstrip("/").rsplit(":", 1)[1]))


def test_webview2_detection_is_false_outside_windows() -> None:
    if launcher.sys.platform != "win32":
        assert launcher.webview2_runtime_available() is False


def test_constraints_are_derived_from_lock_file() -> None:
    lock = "anyio==4.15.1 \\\n    --hash=sha256:abc\n# comment\nclick==8.5.0 \\\n"
    assert constraints(lock) == ["anyio==4.15.1", "click==8.5.0"]


def test_built_frontend_loads_no_external_resources() -> None:
    index = Path(__file__).resolve().parents[1] / "index.html"
    html = index.read_text(encoding="utf-8")
    assert "http://" not in html and "https://" not in html
