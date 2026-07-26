#!/usr/bin/env python3
"""
Inject Clay settings into the Pebble emulator's localStorage.

Usage:
    python3 scripts/inject-emu-settings.py [settings-file] [platform]

Defaults:
    settings-file: emu-settings.json
    platform: emery

Environment overrides:
    PEBBLE_SDK_ROOT
        Pebble SDK data root, for example ~/.local/share/pebble-sdk

    PEBBLE_EMULATOR_LOCALSTORAGE
        Exact localStorage directory to use
"""

import dbm.dumb
import json
import os
import sys
from pathlib import Path


def sdk_root_candidates():
    override = os.environ.get("PEBBLE_SDK_ROOT")
    if override:
        yield Path(override).expanduser()

    yield Path.home() / ".local" / "share" / "pebble-sdk"
    yield Path.home() / "Library" / "Application Support" / "Pebble SDK"


def find_sdk_root():
    for candidate in sdk_root_candidates():
        if (candidate / "SDKs").is_dir():
            return candidate

    return None


def find_sdk_version(sdk_root):
    sdks_dir = sdk_root / "SDKs"
    current = sdks_dir / "current"

    if current.exists():
        resolved = current.resolve()
        if resolved.name and resolved.name != "current":
            return resolved.name

    versions = sorted(
        (
            directory.name
            for directory in sdks_dir.iterdir()
            if directory.is_dir()
            and directory.name
            and directory.name[0].isdigit()
        ),
        reverse=True,
    )

    return versions[0] if versions else None


def resolve_localstorage_dir(sdk_root, sdk_version, platform):
    override = os.environ.get("PEBBLE_EMULATOR_LOCALSTORAGE")
    if override:
        return Path(override).expanduser()

    candidates = [
        sdk_root / sdk_version / platform / "localstorage",
        sdk_root / "SDKs" / sdk_version / platform / "localstorage",
        sdk_root / "SDKs" / "current" / platform / "localstorage",
    ]

    for candidate in candidates:
        if candidate.is_dir():
            return candidate

    return candidates[0]


def main():
    settings_file = Path(
        sys.argv[1] if len(sys.argv) > 1 else "emu-settings.json"
    )
    platform = sys.argv[2] if len(sys.argv) > 2 else "emery"

    with open("package.json", "r", encoding="utf-8") as file:
        package_json = json.load(file)

    app_uuid = package_json["pebble"]["uuid"]
    sdk_root = find_sdk_root()

    if sdk_root is None:
        print(
            "Could not find the Pebble SDK data root. "
            "Set PEBBLE_SDK_ROOT if it is installed elsewhere.",
            file=sys.stderr,
        )
        sys.exit(1)

    sdk_version = find_sdk_version(sdk_root)

    if not sdk_version:
        print("Could not determine the Pebble SDK version.", file=sys.stderr)
        sys.exit(1)

    if not settings_file.is_file():
        print(f"Settings file not found: {settings_file}", file=sys.stderr)
        print("\nExample emu-settings.json:", file=sys.stderr)
        print(
            json.dumps(
                {
                    "accountName": "your_librelinkup_email",
                    "password": "your_librelinkup_password",
                    "server": "europe",
                    "unit": "mmol",
                    "language": "auto",
                    "reversed": False,
                    "quickView": False,
                    "lowThreshold": 80,
                    "highThreshold": 180,
                    "acousticAlarmEnabled": False,
                    "lowAlarmThreshold": 70,
                    "highAlarmThreshold": 250,
                    "goodColor": "0x00AA00",
                    "warningColor": "0xFFAA00",
                    "alarmColor": "0xAA0000",
                    "pollIntervalMinutes": 5,
                    "deltaIntervalMinutes": 5,
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        sys.exit(1)

    with settings_file.open("r", encoding="utf-8") as file:
        settings = json.load(file)

    emu_dir = resolve_localstorage_dir(
        sdk_root,
        sdk_version,
        platform,
    )
    emu_dir.mkdir(parents=True, exist_ok=True)
    db_path = emu_dir / app_uuid

    for extension in ("", ".dat", ".dir", ".bak"):
        try:
            Path(str(db_path) + extension).unlink()
        except FileNotFoundError:
            pass

    database = dbm.dumb.open(str(db_path), "c")
    try:
        database["clay-settings"] = json.dumps(settings)
    finally:
        database.close()

    print(f"Injected settings into {db_path}")
    print(f"Pebble SDK root: {sdk_root}")
    print(f"SDK version: {sdk_version}")
    print(f"App UUID: {app_uuid}")


if __name__ == "__main__":
    main()
