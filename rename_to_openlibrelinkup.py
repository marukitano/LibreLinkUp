#!/usr/bin/env python3
"""Rename the Pebble package while preserving all other metadata."""

from pathlib import Path
import json
import sys

DISPLAY_NAME = "OpenLibreLinkUp"
NPM_NAME = "open-libre-link-up"


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"Fehler: {path} wurde nicht gefunden.", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as exc:
        print(f"Fehler in {path}: {exc}", file=sys.stderr)
        sys.exit(1)


package_path = Path("package.json")
package = load_json(package_path)

pebble = package.get("pebble")
if not isinstance(pebble, dict):
    print('Fehler: In package.json fehlt der Bereich "pebble".', file=sys.stderr)
    sys.exit(1)

old_display_name = pebble.get("displayName", "<nicht gesetzt>")
pebble["displayName"] = DISPLAY_NAME
package["name"] = NPM_NAME

package_path.write_text(
    json.dumps(package, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)

lock_path = Path("package-lock.json")
if lock_path.exists():
    lock = load_json(lock_path)
    lock["name"] = NPM_NAME

    packages = lock.get("packages")
    if isinstance(packages, dict) and isinstance(packages.get(""), dict):
        packages[""]["name"] = NPM_NAME

    lock_path.write_text(
        json.dumps(lock, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

print(f'Pebble-Anzeigename: "{old_display_name}" -> "{DISPLAY_NAME}"')
print(f'NPM-Paketname: "{NPM_NAME}"')
print("Alle übrigen Paketdaten bleiben unverändert.")
