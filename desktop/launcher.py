"""Start des Failover Routing Visualizers als Desktop-Programm.

Das Programm startet die vorhandene FastAPI-Anwendung samt gebauter Oberfläche
auf ``127.0.0.1`` und zeigt sie in einem eigenen Fenster an. Der Server läuft
als Thread im Programm selbst. Wird das Fenster geschlossen, endet der Server
und damit das Programm. Es gibt keine zweite Routingimplementierung und keine
zweite Oberfläche.
"""

from __future__ import annotations

import argparse
import json
import logging
import logging.handlers
import os
import socket
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable

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
# Wird ausschließlich mit der Option --probe-internet angesprochen. Im
# normalen Betrieb baut das Programm keine Verbindung nach außen auf.
INTERNET_PROBE_HOST = "github.com"

logger = logging.getLogger("desktop")

# Anfragen an den eigenen Server dürfen nie über einen eingestellten Proxy
# laufen; sonst scheitert der Start auf Rechnern mit Proxy-Konfiguration.
_LOCAL_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


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
        # Anhängen statt überschreiben: eine zweite Instanz löscht das
        # Protokoll der ersten nicht.
        handlers.append(
            logging.handlers.RotatingFileHandler(
                log_file, maxBytes=1_000_000, backupCount=1, encoding="utf-8"
            )
        )
    except OSError:
        log_file = None
    if sys.stderr is not None:
        handlers.append(logging.StreamHandler())
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(process)d] %(name)s: %(message)s",
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
            with _LOCAL_OPENER.open(f"{self.url}api/health", timeout=2) as response:
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


def _create_window(url: str):
    import webview

    # Für „Szenario speichern“: Downloads mit Speichern-Dialog zulassen.
    webview.settings["ALLOW_DOWNLOADS"] = True
    return webview.create_window(
        APP_NAME, url, width=1440, height=900, min_size=(1024, 700)
    )


def _start_gui(function: Callable[..., None] | None = None, arguments: tuple = ()) -> None:
    import webview

    webview.start(
        function, arguments, gui="edgechromium" if sys.platform == "win32" else None
    )


def run_window(url: str) -> bool:
    """Zeigt die Oberfläche in einem eigenen Fenster. ``False``: nicht möglich."""
    if sys.platform == "win32" and not webview2_runtime_available():
        logger.warning("WebView2-Laufzeit nicht gefunden; verwende den Browser.")
        return False
    try:
        import webview  # noqa: F401
    except Exception:  # noqa: BLE001 - jede Importstörung führt zum Browser
        logger.exception("pywebview ist nicht verfügbar; verwende den Browser.")
        return False
    started = threading.Event()
    try:
        _create_window(url)
        _start_gui(started.set)
    except Exception:  # noqa: BLE001
        logger.exception("Das Anwendungsfenster wurde mit einem Fehler beendet.")
        # War das Fenster bereits offen, wird nicht zusätzlich der Browser
        # geöffnet, nachdem es geschlossen wurde.
        return started.is_set()
    return True


def _quit_window(url: str) -> None:
    """Kleines Fenster zum Beenden, solange die Oberfläche im Browser läuft."""
    import tkinter
    import webbrowser
    from tkinter import ttk

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


def _quit_without_tk(url: str) -> None:
    """Ausweg ohne tkinter: nie unsichtbar und unbeendbar weiterlaufen."""
    if sys.platform == "win32":
        import ctypes

        # Blockiert, bis „OK“ gewählt wird; danach endet das Programm.
        ctypes.windll.user32.MessageBoxW(
            None,
            f"{APP_NAME} läuft im Browser unter\n{url}\n\n"
            "„OK“ beendet das Programm.",
            APP_NAME,
            0x40,
        )
        return
    logger.warning("Kein Fenster verfügbar; beenden mit Strg+C.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        return


def run_in_browser(url: str) -> None:
    """Ersatzweg: Standardbrowser plus kleines Fenster zum Beenden."""
    import webbrowser

    webbrowser.open(url)
    try:
        _quit_window(url)
    except Exception:  # noqa: BLE001 - tkinter fehlt oder startet nicht
        logger.exception("Das Fenster zum Beenden konnte nicht geöffnet werden.")
        _quit_without_tk(url)


# --------------------------------------------------------------------------
# Selbsttests. Sie laufen nur mit --smoke-test beziehungsweise --window-test.
# --------------------------------------------------------------------------

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


def internet_reachable(timeout: float = 5.0) -> bool:
    """Nur für --probe-internet: Lässt sich ein öffentlicher Host erreichen?"""
    try:
        with socket.create_connection((INTERNET_PROBE_HOST, 443), timeout=timeout):
            return True
    except OSError:
        return False


def _request(
    url: str,
    *,
    method: str = "GET",
    body: bytes | None = None,
    content_type: str = "application/json",
) -> tuple[int, bytes]:
    """Anfrage an den eigenen Server; Fehlerantworten werden zurückgegeben."""
    request = urllib.request.Request(url, data=body, method=method)
    if body is not None:
        request.add_header("Content-Type", content_type)
    try:
        with _LOCAL_OPENER.open(request, timeout=30) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def smoke_test(server: LocalServer, *, probe_internet: bool = False) -> dict:
    """Prüft das gepackte Programm ohne Fenster: Oberfläche, API, Routing."""
    base = server.url
    checks: dict[str, bool] = {}
    status, body = _request(f"{base}api/health")
    checks["health"] = status == 200 and json.loads(body) == {"status": "ok"}

    status, index = _request(base)
    html = index.decode("utf-8")
    checks["index"] = status == 200 and APP_NAME in html
    assets = [
        part.split('"')[0]
        for part in html.split('"/')[1:]
        if part.startswith("assets/")
    ]
    checks["assets_local"] = bool(assets) and all(
        _request(f"{base}{asset}")[0] == 200 for asset in assets
    )
    # Statische Prüfung der Startseite. Ob die Oberfläche zur Laufzeit etwas
    # aus dem Netz lädt, zeigt erst eine Prüfung ohne Internetzugang.
    checks["index_without_external_references"] = (
        "http://" not in html and "https://" not in html
    )

    # Dateiimport
    status, body = _request(
        f"{base}api/sessions/import?filename=smoke.json",
        method="POST",
        body=json.dumps(SMOKE_TOPOLOGY).encode("utf-8"),
        content_type="application/octet-stream",
    )
    session = json.loads(body)
    checks["import"] = status == 200 and session["result"]["reachable_node_count"] == 4

    # Routing: kürzester Pfad mit Ausfall, danach Bonsai mit Ausfall
    status, body = _request(
        f"{base}api/sessions/{session['session_id']}",
        method="PATCH",
        body=json.dumps({"failed_edge_ids": ["ab"]}).encode("utf-8"),
    )
    shortest = json.loads(body)
    checks["shortest_path"] = (
        status == 200
        and shortest["result"]["reachable_node_count"] == 4
        and shortest["result"]["current_paths"]["B"]["node_ids"] == ["B", "C", "D", "A"]
        and shortest["result"]["current_paths"]["C"]["node_ids"] == ["C", "D", "A"]
        and shortest["result"]["changed_node_ids"] == ["B", "C"]
        and shortest["result"]["affected_node_ids"] == []
    )
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
    status, exported = _request(f"{base}api/sessions/{session['session_id']}/scenario")
    scenario_api_present = status == 200
    if scenario_api_present:
        status, restored = _request(
            f"{base}api/sessions/import-scenario", method="POST", body=exported
        )
        checks["scenario_roundtrip"] = (
            status == 200
            and json.loads(restored)["result"] == bonsai["result"]
            and json.loads(restored)["failures"] == bonsai["failures"]
            and json.loads(restored)["routing"] == bonsai["routing"]
        )
        # Ein unbekanntes Feld erkennt nur die Schemaprüfung. Fehlte das
        # Paket jsonschema im gepackten Programm, würde die Datei angenommen.
        unknown_field = {**json.loads(exported), "unbekanntes_feld": True}
        status, _ = _request(
            f"{base}api/sessions/import-scenario",
            method="POST",
            body=json.dumps(unknown_field).encode("utf-8"),
        )
        checks["scenario_schema_enforced"] = status == 422
        newer = {**json.loads(exported), "format_version": "2.0"}
        status, rejected = _request(
            f"{base}api/sessions/import-scenario",
            method="POST",
            body=json.dumps(newer).encode("utf-8"),
        )
        checks["scenario_version_checked"] = (
            status == 422
            and json.loads(rejected).get("code") == "unsupported_format_version"
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
        "scenario_api_present": scenario_api_present,
        "internet": {
            "probed": probe_internet,
            "python_reachable": internet_reachable() if probe_internet else None,
        },
    }


# Liest den sichtbaren Zustand der Oberfläche im Anwendungsfenster aus.
WINDOW_STATE_SCRIPT = """
(function () {
  function text(element) {
    return element ? (element.innerText || element.textContent || "") : "";
  }
  function button(label) {
    var all = document.querySelectorAll("button");
    for (var i = 0; i < all.length; i += 1) {
      if (text(all[i]).indexOf(label) !== -1) { return all[i]; }
    }
    return null;
  }
  var body = text(document.body);
  var selects = document.querySelectorAll("aside select");
  var bonsai = button("Bonsai (Greedy)");
  var failures = body.match(/Aktive Ausf\\u00e4lle \\((\\d+)\\)/);
  var statusBar = document.querySelector("main > section > div:nth-child(2)");
  var captured = window.__frvCaptured || null;
  return JSON.stringify({
    title: document.title,
    sidebar: Boolean(document.querySelector("aside")),
    header: text(document.querySelector("header")),
    nodes: document.querySelectorAll("[data-graph-node-id]").length,
    status: statusBar && statusBar.firstElementChild
      ? text(statusBar.firstElementChild).replace(/\\s+/g, " ").trim() : "",
    summary: text(document.querySelector('[role="separator"]')).replace(/\\s+/g, " ").trim(),
    target: selects.length ? selects[0].value : "",
    bonsai: Boolean(bonsai && bonsai.getAttribute("aria-pressed") === "true"),
    failures: failures ? Number(failures[1]) : null,
    loading: body.indexOf("Berechnung l\\u00e4uft") !== -1,
    hasScenario: Boolean(button("Szenario speichern")),
    loadedScenario: body.indexOf("Geladenes Szenario:") !== -1,
    capturedName: captured ? captured.name : null,
    capturedText: captured ? captured.text : null,
    internet: window.__frvInternet === undefined ? null : window.__frvInternet,
    userAgent: navigator.userAgent
  });
})()
"""

# Betätigt eine Schaltfläche anhand eines Teils ihrer Beschriftung.
WINDOW_CLICK_SCRIPT = """
(function () {
  var label = %s;
  var all = document.querySelectorAll("button");
  for (var i = 0; i < all.length; i += 1) {
    if ((all[i].innerText || "").indexOf(label) !== -1) {
      if (all[i].disabled) { return "gesperrt"; }
      all[i].click();
      return "ok";
    }
  }
  return "fehlt";
})()
"""

# Wählt eine Datei so aus, wie es der Dateidialog der Oberfläche tut.
WINDOW_FILE_SCRIPT = """
(function () {
  var input = document.querySelector(%s);
  if (!input) { return "kein Dateifeld"; }
  var data = new DataTransfer();
  data.items.add(new File([%s], %s, { type: "application/json" }));
  input.files = data.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return "ok";
})()
"""

# Fängt den Download von „Szenario speichern“ ab und hält den Inhalt fest.
# Der Speichern-Dialog des Fensters wird damit umgangen; ihn prüft der
# getrennte Lauf mit --native-save-file.
WINDOW_CAPTURE_SCRIPT = """
(function () {
  if (window.__frvCaptureInstalled) { return "ok"; }
  window.__frvCaptureInstalled = true;
  window.__frvCaptured = null;
  var original = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && String(this.href).indexOf("blob:") === 0) {
      var name = this.download;
      fetch(this.href)
        .then(function (response) { return response.text(); })
        .then(function (content) { window.__frvCaptured = { name: name, text: content }; });
      return undefined;
    }
    return original.apply(this, arguments);
  };
  return "ok";
})()
"""

# Nur mit --probe-internet: Kann die Seite einen öffentlichen Host erreichen?
WINDOW_INTERNET_SCRIPT = """
(function () {
  window.__frvInternet = undefined;
  var controller = new AbortController();
  setTimeout(function () { controller.abort(); }, 8000);
  fetch("https://%s/", { mode: "no-cors", cache: "no-store", signal: controller.signal })
    .then(function () { window.__frvInternet = true; })
    .catch(function () { window.__frvInternet = false; });
  return "gestartet";
})()
"""

TOPOLOGY_INPUT_SELECTOR = 'input[type="file"][accept*=".graphml"]'
SCENARIO_INPUT_SELECTOR = 'input[type="file"][accept*="application/json"]'
DOMAIN_STATE_KEYS = ("target", "bonsai", "failures", "status", "summary")


def window_click_script(label: str) -> str:
    return WINDOW_CLICK_SCRIPT % json.dumps(label)


def window_file_script(selector: str, content: str, file_name: str) -> str:
    return WINDOW_FILE_SCRIPT % (
        json.dumps(selector), json.dumps(content), json.dumps(file_name)
    )


def window_import_script() -> str:
    return window_file_script(
        TOPOLOGY_INPUT_SELECTOR, json.dumps(SMOKE_TOPOLOGY), "fenstertest.json"
    )


def window_internet_script() -> str:
    return WINDOW_INTERNET_SCRIPT % INTERNET_PROBE_HOST


def scenario_text_is_expected(text: str | None) -> bool:
    """Entspricht die gespeicherte Datei dem im Fenster eingestellten Zustand?"""
    try:
        data = json.loads(text or "")
        return (
            data["format_version"] == "1.0"
            and len(data["topology"]["nodes"]) == 4
            and data["routing"]["strategy"] == "bonsai_greedy"
            and data["routing"]["target_node_id"] == "A"
            and data["failures"]["failed_edge_ids"] == ["ab"]
        )
    except (ValueError, KeyError, TypeError):
        return False


def drive_window_test(
    evaluate: Callable[[str], Any],
    *,
    probe_internet: bool = False,
    native_save_file: Path | None = None,
    sleep: Callable[[float], None] = time.sleep,
    step_timeout: float = 45.0,
    native_save_timeout: float = 75.0,
) -> tuple[dict[str, bool], dict[str, Any]]:
    """Bedient die Oberfläche über ``evaluate`` und prüft ihren Zustand.

    Ablauf: Oberfläche gezeichnet, Topologie über das Dateifeld importiert,
    Bonsai gewählt und eine Kante ausfallen lassen, Szenario gespeichert,
    Zustand verändert und das Szenario wieder geladen. ``evaluate`` führt
    JavaScript in der Seite aus und liefert dessen Ergebnis.
    """
    checks: dict[str, bool] = {}
    details: dict[str, Any] = {}

    def read_state() -> dict:
        return json.loads(evaluate(WINDOW_STATE_SCRIPT))

    def wait_for(condition: Callable[[dict], Any], seconds: float = step_timeout) -> dict:
        deadline = time.monotonic() + seconds
        state: dict = {}
        while True:
            try:
                state = read_state()
            except Exception as error:  # noqa: BLE001 - Seite lädt noch
                details["last_script_error"] = repr(error)
            else:
                if condition(state):
                    return state
            if time.monotonic() >= deadline:
                return state
            sleep(0.4)

    def click(label: str, seconds: float = 20.0) -> str:
        deadline = time.monotonic() + seconds
        while True:
            outcome = evaluate(window_click_script(label))
            if outcome == "ok" or time.monotonic() >= deadline:
                return str(outcome)
            sleep(0.4)

    def domain_state(state: dict) -> dict:
        return {key: state.get(key) for key in DOMAIN_STATE_KEYS}

    def idle(state: dict) -> bool:
        return not state.get("loading")

    # Oberfläche
    state = wait_for(lambda item: item.get("sidebar"))
    details["user_agent"] = state.get("userAgent", "")
    checks["ui_rendered"] = (
        state.get("title") == APP_NAME
        and bool(state.get("sidebar"))
        and APP_NAME in state.get("header", "")
    )

    # Dateiimport
    details["import_script"] = evaluate(window_import_script())
    state = wait_for(
        lambda item: item.get("nodes") == 4
        and item.get("status") == "Normalbetrieb"
        and idle(item)
    )
    details["nodes_drawn"] = state.get("nodes")
    checks["file_import_through_ui"] = (
        state.get("nodes") == 4 and state.get("status") == "Normalbetrieb"
    )

    # Routing: Bonsai wählen, eine Kante ausfallen lassen
    details["click_bonsai"] = click("Bonsai (Greedy)")
    state = wait_for(lambda item: item.get("bonsai") and idle(item))
    details["click_failure"] = click("ausfallen lassen")
    state = wait_for(lambda item: item.get("failures") == 1 and idle(item))
    saved_state = domain_state(state)
    details["routing_state"] = saved_state
    checks["routing_through_ui"] = (
        bool(state.get("bonsai"))
        and state.get("failures") == 1
        and state.get("status") == "Failover aktiv"
        and "Erreichbarkeit 4/4" in state.get("summary", "")
    )

    # Szenario speichern und laden (nur wenn die Bedienelemente vorhanden sind)
    details["scenario_controls_present"] = bool(state.get("hasScenario"))
    if state.get("hasScenario"):
        if native_save_file is None:
            evaluate(WINDOW_CAPTURE_SCRIPT)
            details["click_save"] = click("Szenario speichern")
            state = wait_for(lambda item: item.get("capturedText"))
            text = state.get("capturedText")
            details["scenario_file_name"] = state.get("capturedName")
            details["scenario_saved_via"] = "abgefangener Download"
        else:
            # Der Speichern-Dialog des Fensters wird von außen bedient.
            details["click_save"] = click("Szenario speichern")
            text = None
            deadline = time.monotonic() + native_save_timeout
            while time.monotonic() < deadline:
                try:
                    candidate = native_save_file.read_text(encoding="utf-8-sig")
                    json.loads(candidate)
                    text = candidate
                    break
                except (OSError, ValueError):
                    sleep(0.5)
            details["scenario_file_name"] = str(native_save_file)
            details["scenario_saved_via"] = "Speichern-Dialog"
            if text is None:
                # Der Dialog ist dann vermutlich noch offen. Weitere Skripte
                # in der Seite würden so lange blockieren; hier endet der Test.
                checks["scenario_saved_through_ui"] = False
                details["native_save"] = "Datei über den Speichern-Dialog nicht entstanden"
                return checks, details
        checks["scenario_saved_through_ui"] = scenario_text_is_expected(text)

        details["click_repair"] = click("Alle Kanten wiederherstellen")
        state = wait_for(lambda item: item.get("failures") == 0 and idle(item))
        details["failures_before_load"] = state.get("failures")
        if text:
            details["load_script"] = evaluate(
                window_file_script(SCENARIO_INPUT_SELECTOR, text, "fenstertest-szenario.json")
            )
        state = wait_for(
            lambda item: item.get("loadedScenario")
            and item.get("failures") == 1
            and idle(item)
        )
        details["state_after_load"] = domain_state(state)
        checks["scenario_loaded_through_ui"] = (
            bool(text)
            and details["failures_before_load"] == 0
            and bool(state.get("loadedScenario"))
            and domain_state(state) == saved_state
        )

    if probe_internet:
        evaluate(window_internet_script())
        state = wait_for(lambda item: item.get("internet") is not None, 15)
        details["page_internet_reachable"] = state.get("internet")
    return checks, details


def run_window_test(
    url: str,
    *,
    probe_internet: bool = False,
    native_save_file: Path | None = None,
    timeout: float = 90.0,
) -> dict:
    """Öffnet das echte Anwendungsfenster und prüft die Oberfläche darin."""
    checks: dict[str, bool] = {}
    details: dict[str, Any] = {}
    if sys.platform == "win32" and not webview2_runtime_available():
        details["error"] = "WebView2-Laufzeit nicht gefunden"
        return {"passed": False, "checks": checks, "details": details}

    def drive(window) -> None:
        try:
            checks["window_loaded"] = bool(window.events.loaded.wait(timeout))
            driven_checks, driven_details = drive_window_test(
                window.evaluate_js,
                probe_internet=probe_internet,
                native_save_file=native_save_file,
            )
            checks.update(driven_checks)
            details.update(driven_details)
            if sys.platform == "win32":
                checks["webview2_engine"] = "Edg/" in str(details.get("user_agent"))
        except Exception as error:  # noqa: BLE001
            logger.exception("Fenstertest abgebrochen.")
            details["error"] = repr(error)
        finally:
            window.destroy()

    try:
        window = _create_window(url)
        _start_gui(drive, (window,))
    except Exception as error:  # noqa: BLE001
        logger.exception("Das Anwendungsfenster konnte nicht geöffnet werden.")
        details["error"] = repr(error)
    expected = {
        "window_loaded", "ui_rendered", "file_import_through_ui", "routing_through_ui",
    }
    if details.get("scenario_controls_present"):
        expected |= {"scenario_saved_through_ui", "scenario_loaded_through_ui"}
    passed = expected <= set(checks) and all(checks.values())
    return {
        "passed": passed,
        "checks": checks,
        "details": details,
        "internet": {
            "probed": probe_internet,
            "python_reachable": internet_reachable() if probe_internet else None,
            "page_reachable": details.get("page_internet_reachable"),
        },
    }


def parse_arguments(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=APP_NAME)
    parser.add_argument("--port", type=int, default=0,
                        help="fester Port statt eines freien Ports")
    parser.add_argument("--browser", action="store_true",
                        help="Standardbrowser statt eines eigenen Fensters verwenden")
    parser.add_argument("--smoke-test", action="store_true",
                        help="ohne Fenster starten, Kernfunktionen prüfen und beenden")
    parser.add_argument("--window-test", action="store_true",
                        help="Fenster öffnen, Oberfläche darin prüfen und beenden")
    parser.add_argument("--native-save-file", type=Path,
                        help="mit --window-test: „Szenario speichern“ über den "
                             "Speichern-Dialog; die Datei wird unter diesem Pfad erwartet")
    parser.add_argument("--probe-internet", action="store_true",
                        help="mit einem Selbsttest: zusätzlich prüfen, ob ein "
                             "öffentlicher Host erreichbar ist (für Offline-Prüfungen)")
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
        if arguments.smoke_test or arguments.window_test:
            try:
                if arguments.window_test:
                    result = run_window_test(
                        server.url,
                        probe_internet=arguments.probe_internet,
                        native_save_file=arguments.native_save_file,
                    )
                else:
                    result = smoke_test(server, probe_internet=arguments.probe_internet)
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
    except Exception:  # noqa: BLE001
        logger.exception("Unerwarteter Fehler.")
        _show_error(
            "Das Programm wurde wegen eines Fehlers beendet.\n"
            f"Einzelheiten stehen im Protokoll:\n{log_file}"
        )
        return 1
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
