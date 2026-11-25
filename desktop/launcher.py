"""Start des Failover Routing Visualizers als Desktop-Programm.

Ein einzelner Prozess startet die vorhandene FastAPI-Anwendung samt gebauter
Oberfläche auf ``127.0.0.1`` und zeigt sie in einem eigenen Fenster an. Wird
das Fenster geschlossen, endet der Server und damit der Prozess. Es gibt keine
zweite Routingimplementierung und keine zweite Oberfläche.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import socket
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import uvicorn

from backend.api import SessionStore, create_app

APP_NAME = "Failover Routing Visualizer"
APP_ID = "FailoverRoutingVisualizer"
# Nur die lokale Schleife: von anderen Rechnern aus nicht erreichbar.
HOST = "127.0.0.1"
WEBVIEW2_CLIENT_KEYS = (
    "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",  # WebView2 Runtime
    "{2CD8A007-E189-409D-A2C8-9AF4EF3C72AA}",  # Beta
    "{0D50BFEC-CD6A-4F9A-964C-C7416E3ACB10}",  # Dev
    "{65C35B14-6C1D-4122-AC46-7148CC9D6497}",  # Canary
)

logger = logging.getLogger("desktop")


def bundle_root() -> Path:
    """Ordner mit den mitgelieferten Dateien (PyInstaller oder Repository)."""
    frozen_root = getattr(sys, "_MEIPASS", None)
    if frozen_root:
        return Path(frozen_root)
    return Path(__file__).resolve().parents[1]


def frontend_directory() -> Path:
    directory = bundle_root() / "dist"
    if not (directory / "index.html").is_file():
        raise FileNotFoundError(
            f"Die gebaute Oberfläche fehlt unter {directory}. "
            "Bitte zuerst `npm run build` ausführen."
        )
    return directory


def log_directory() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    else:
        base = Path(os.environ.get("XDG_STATE_HOME") or Path.home() / ".local" / "state")
    return base / APP_ID


def configure_logging() -> Path | None:
    """Schreibt in eine Datei; ein Fensterprogramm hat keine Konsole."""
    handlers: list[logging.Handler] = []
    log_file: Path | None = None
    try:
        directory = log_directory()
        directory.mkdir(parents=True, exist_ok=True)
        log_file = directory / "app.log"
        handlers.append(logging.FileHandler(log_file, mode="w", encoding="utf-8"))
    except OSError:
        log_file = None
    if sys.stderr is not None:
        handlers.append(logging.StreamHandler())
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=handlers or [logging.NullHandler()],
        force=True,
    )
    # Bibliotheken, die auf stdout/stderr schreiben, dürfen ohne Konsole
    # nicht abstürzen.
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")  # noqa: SIM115
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")  # noqa: SIM115
    return log_file


class LocalServer:
    """Die vorhandene Anwendung als Hintergrund-Thread im selben Prozess."""

    def __init__(self, frontend: Path, port: int = 0) -> None:
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if sys.platform != "win32":
            self._socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        # Port 0: das Betriebssystem vergibt einen freien Port. Der Socket
        # bleibt bis zum Start gebunden, es gibt also kein Wettrennen.
        self._socket.bind((HOST, port))
        self.port: int = self._socket.getsockname()[1]
        app = create_app(SessionStore(), frontend_directory=frontend)
        config = uvicorn.Config(
            app,
            host=HOST,
            port=self.port,
            log_config=None,
            access_log=False,
            workers=1,
        )
        self._server = uvicorn.Server(config)
        self._thread = threading.Thread(
            target=self._run, name="local-api", daemon=True
        )
        self._error: BaseException | None = None

    @property
    def bind_address(self) -> str:
        return self._socket.getsockname()[0]

    @property
    def url(self) -> str:
        return f"http://{HOST}:{self.port}/"

    def _run(self) -> None:
        try:
            self._server.run(sockets=[self._socket])
        except BaseException as error:  # noqa: BLE001 - an den Aufrufer melden
            self._error = error
            logger.exception("Der lokale Server wurde unerwartet beendet.")

    def start(self, timeout: float = 30.0) -> None:
        self._thread.start()
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self._error is not None:
                raise RuntimeError("Der lokale Server konnte nicht starten.") from self._error
            if self._server.started and self._healthy():
                logger.info("Lokaler Server läuft unter %s", self.url)
                return
            if not self._thread.is_alive():
                break
            time.sleep(0.05)
        self.stop()
        raise RuntimeError("Der lokale Server hat nicht rechtzeitig geantwortet.")

    def _healthy(self) -> bool:
        try:
            with urllib.request.urlopen(f"{self.url}api/health", timeout=2) as response:
                return response.status == 200
        except (OSError, urllib.error.URLError):
            return False

    @property
    def running(self) -> bool:
        return self._thread.is_alive()

    def stop(self, timeout: float = 10.0) -> None:
        self._server.should_exit = True
        if self._thread.is_alive():
            self._thread.join(timeout)
        if self._thread.is_alive():
            self._server.force_exit = True
            self._thread.join(timeout)
        try:
            self._socket.close()
        except OSError:
            pass
        logger.info("Lokaler Server beendet.")


def webview2_runtime_available() -> bool:
    """Prüft wie pywebview, ob die WebView2-Laufzeit installiert ist.

    Ohne sie würde pywebview stillschweigend die veraltete MSHTML-Engine
    verwenden, in der die Oberfläche nicht funktioniert.
    """
    if sys.platform != "win32":
        return False
    import winreg

    for hive in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
        for prefix in (r"SOFTWARE\WOW6432Node", r"SOFTWARE"):
            for client in WEBVIEW2_CLIENT_KEYS:
                try:
                    with winreg.OpenKey(
                        hive, rf"{prefix}\Microsoft\EdgeUpdate\Clients\{client}"
                    ) as key:
                        version, _ = winreg.QueryValueEx(key, "pv")
                except OSError:
                    continue
                if str(version) not in ("", "0.0.0.0"):
                    return True
    return False


def run_window(url: str) -> bool:
    """Zeigt die Oberfläche in einem eigenen Fenster. ``False``: nicht möglich."""
    if sys.platform == "win32" and not webview2_runtime_available():
        logger.warning("WebView2-Laufzeit nicht gefunden; verwende den Browser.")
        return False
    try:
        import webview
    except Exception:  # noqa: BLE001 - jede Importstörung führt zum Browser
        logger.exception("pywebview ist nicht verfügbar; verwende den Browser.")
        return False
    try:
        # Für „Szenario speichern“: Downloads mit Speichern-Dialog zulassen.
        webview.settings["ALLOW_DOWNLOADS"] = True
        webview.create_window(
            APP_NAME, url, width=1440, height=900, min_size=(1024, 700)
        )
        webview.start(gui="edgechromium" if sys.platform == "win32" else None)
    except Exception:  # noqa: BLE001
        logger.exception("Das Anwendungsfenster konnte nicht geöffnet werden.")
        return False
    return True


def run_in_browser(url: str) -> None:
    """Ersatzweg: Standardbrowser plus kleines Fenster zum Beenden."""
    import webbrowser

    webbrowser.open(url)
    try:
        import tkinter
        from tkinter import ttk
    except Exception:  # noqa: BLE001
        logger.warning("Kein Fenster verfügbar; beenden mit Strg+C.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            return
        return

    root = tkinter.Tk()
    root.title(APP_NAME)
    root.resizable(False, False)
    frame = ttk.Frame(root, padding=18)
    frame.grid()
    ttk.Label(
        frame,
        text=(
            f"{APP_NAME} läuft im Browser unter\n{url}\n\n"
            "Dieses Fenster schließen, um das Programm zu beenden."
        ),
        justify="left",
    ).grid(row=0, column=0, columnspan=2, sticky="w")
    ttk.Button(
        frame, text="Im Browser öffnen", command=lambda: webbrowser.open(url)
    ).grid(row=1, column=0, pady=(14, 0), sticky="w")
    ttk.Button(frame, text="Beenden", command=root.destroy).grid(
        row=1, column=1, pady=(14, 0), sticky="e"
    )
    root.mainloop()


def externally_reachable(port: int) -> bool | None:
    """Antwortet der Port über eine Nicht-Loopback-Adresse dieses Rechners?

    ``None``: Der Rechner besitzt keine solche IPv4-Adresse; nicht prüfbar.
    """
    addresses: set[str] = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            addresses.add(info[4][0])
    except OSError:
        pass
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("192.0.2.1", 9))  # sendet nichts; ermittelt nur die Adresse
            addresses.add(probe.getsockname()[0])
    except OSError:
        pass
    addresses = {item for item in addresses if not item.startswith("127.")}
    if not addresses:
        return None
    for address in addresses:
        try:
            with socket.create_connection((address, port), timeout=1.5):
                return True
        except OSError:
            continue
    return False


SMOKE_TOPOLOGY = {
    "directed": False,
    "multigraph": False,
    "graph": {"name": "smoke-test"},
    "nodes": [
        {"id": "A", "pos": [0, 0]},
        {"id": "B", "pos": [1, 0]},
        {"id": "C", "pos": [1, 1]},
        {"id": "D", "pos": [0, 1]},
    ],
    "edges": [
        {"id": "ab", "source": "A", "target": "B"},
        {"id": "bc", "source": "B", "target": "C"},
        {"id": "cd", "source": "C", "target": "D"},
        {"id": "da", "source": "D", "target": "A"},
    ],
}


def _request(url: str, *, method: str = "GET", body: bytes | None = None,
             content_type: str = "application/json") -> tuple[int, bytes]:
    request = urllib.request.Request(url, data=body, method=method)
    if body is not None:
        request.add_header("Content-Type", content_type)
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.status, response.read()


def smoke_test(server: LocalServer) -> dict:
    """Prüft das gepackte Programm ohne Fenster: Oberfläche, API, Routing."""
    base = server.url
    checks: dict[str, bool] = {}
    status, body = _request(f"{base}api/health")
    checks["health"] = status == 200 and json.loads(body) == {"status": "ok"}

    status, index = _request(base)
    html = index.decode("utf-8")
    checks["index"] = status == 200 and "Failover Routing Visualizer" in html
    assets = [
        part.split('"')[0]
        for part in html.split('"/')[1:]
        if part.startswith("assets/")
    ]
    checks["assets_local"] = bool(assets) and all(
        _request(f"{base}{asset}")[0] == 200 for asset in assets
    )
    checks["no_external_resources"] = "http://" not in html and "https://" not in html

    status, body = _request(
        f"{base}api/sessions/import?filename=smoke.json",
        method="POST",
        body=json.dumps(SMOKE_TOPOLOGY).encode("utf-8"),
        content_type="application/octet-stream",
    )
    session = json.loads(body)
    checks["import"] = status == 200 and session["result"]["reachable_node_count"] == 4

    status, body = _request(
        f"{base}api/sessions/{session['session_id']}",
        method="PATCH",
        body=json.dumps(
            {"strategy": "bonsai_greedy", "failed_edge_ids": ["ab"]}
        ).encode("utf-8"),
    )
    bonsai = json.loads(body)
    checks["bonsai"] = (
        status == 200
        and bonsai["result"]["bonsai"]["edge_connectivity"] == 2
        and bonsai["result"]["reachable_node_count"] == 4
    )

    # Szenarien speichern und laden, sofern diese Schnittstelle enthalten ist.
    try:
        status, body = _request(f"{base}api/sessions/{session['session_id']}/scenario")
    except urllib.error.HTTPError as error:
        status, body = error.code, b""
    if status == 200:
        status, restored = _request(
            f"{base}api/sessions/import-scenario", method="POST", body=body
        )
        checks["scenario_roundtrip"] = (
            status == 200
            and json.loads(restored)["result"] == bonsai["result"]
        )

    checks["bound_to_loopback"] = server.bind_address == HOST
    reachable = externally_reachable(server.port)
    if reachable is not None:
        # Über eine Netzwerkadresse des Rechners darf der Server nicht antworten.
        checks["not_reachable_from_network"] = not reachable
    return {
        "passed": all(checks.values()),
        "checks": checks,
        "url": base,
        "network_addresses_tested": reachable is not None,
    }


def parse_arguments(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=APP_NAME)
    parser.add_argument("--port", type=int, default=0,
                        help="fester Port statt eines freien Ports")
    parser.add_argument("--browser", action="store_true",
                        help="Standardbrowser statt eines eigenen Fensters verwenden")
    parser.add_argument("--smoke-test", action="store_true",
                        help="ohne Fenster starten, Kernfunktionen prüfen und beenden")
    parser.add_argument("--result-file", type=Path,
                        help="Ergebnis des Selbsttests als JSON in diese Datei schreiben")
    parser.add_argument("--url-file", type=Path,
                        help="Adresse des lokalen Servers in diese Datei schreiben")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    arguments = parse_arguments(argv)
    log_file = configure_logging()
    logger.info("%s startet (Protokoll: %s)", APP_NAME, log_file)
    try:
        server = LocalServer(frontend_directory(), port=arguments.port)
        server.start()
    except Exception:  # noqa: BLE001
        logger.exception("Start fehlgeschlagen.")
        _show_error(
            "Das Programm konnte nicht gestartet werden.\n"
            f"Einzelheiten stehen im Protokoll:\n{log_file}"
        )
        return 1

    try:
        if arguments.url_file:
            arguments.url_file.write_text(server.url, encoding="utf-8")
        if arguments.smoke_test:
            try:
                result = smoke_test(server)
            except Exception as error:  # noqa: BLE001
                logger.exception("Selbsttest abgebrochen.")
                result = {"passed": False, "error": repr(error)}
            text = json.dumps(result, indent=2, ensure_ascii=False)
            logger.info("Selbsttest: %s", text)
            if arguments.result_file:
                arguments.result_file.write_text(text, encoding="utf-8")
            return 0 if result["passed"] else 1
        if arguments.browser or not run_window(server.url):
            run_in_browser(server.url)
        return 0
    finally:
        server.stop()


def _show_error(message: str) -> None:
    if sys.platform == "win32":
        try:
            import ctypes

            ctypes.windll.user32.MessageBoxW(None, message, APP_NAME, 0x10)
            return
        except Exception:  # noqa: BLE001
            pass
    print(message, file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
