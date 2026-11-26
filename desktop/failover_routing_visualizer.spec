# PyInstaller-Beschreibung für das Windows-Programm.
#
#   pyinstaller --noconfirm --clean desktop/failover_routing_visualizer.spec
#
# Voraussetzung: `npm run build` hat den Ordner `dist/` erzeugt. PyInstaller
# schreibt sein Ergebnis nach `build/desktop/`, damit `dist/` der Oberfläche
# unberührt bleibt (siehe desktop/build_windows.ps1).
from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

ROOT = Path(SPECPATH).resolve().parent
FRONTEND = ROOT / "dist"
if not (FRONTEND / "index.html").is_file():
    raise SystemExit("dist/index.html fehlt. Bitte zuerst `npm run build` ausführen.")

datas = [
    (str(FRONTEND), "dist"),
    (str(ROOT / "backend" / "schemas"), "backend/schemas"),
]
datas += collect_data_files("jsonschema")
datas += collect_data_files("jsonschema_specifications")

hiddenimports = collect_submodules("uvicorn") + collect_submodules("backend")

analysis = Analysis(
    [str(ROOT / "desktop" / "launcher.py")],
    pathex=[str(ROOT)],
    datas=datas,
    hiddenimports=hiddenimports,
    excludes=["pytest", "httpx", "_pytest"],
    noarchive=False,
)
pyz = PYZ(analysis.pure)
exe = EXE(
    pyz,
    analysis.scripts,
    analysis.binaries,
    analysis.datas,
    [],
    name="FailoverRoutingVisualizer",
    console=False,
    upx=False,
)
