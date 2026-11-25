"""Leitet aus requirements-lock.txt Versionsvorgaben ohne Hashes ab.

Die Lock-Datei wurde unter Linux erzeugt und enthält keine nur unter Windows
benötigten Pakete (zum Beispiel colorama). Für den Windows-Build dienen ihre
Versionen deshalb als Constraints; zusätzliche Pakete löst pip selbst auf.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

PIN = re.compile(r"^([A-Za-z0-9_.\-]+==[^\s\;]+)")


def constraints(lock_text: str) -> list[str]:
    return [match.group(1) for line in lock_text.splitlines() if (match := PIN.match(line))]


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "build" / "constraints-desktop.txt"
    target.parent.mkdir(parents=True, exist_ok=True)
    pins = constraints((root / "requirements-lock.txt").read_text(encoding="utf-8"))
    target.write_text("\n".join(pins) + "\n", encoding="utf-8")
    print(f"{len(pins)} Versionsvorgaben nach {target} geschrieben")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
