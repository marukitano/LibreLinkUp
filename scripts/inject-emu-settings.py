#!/usr/bin/env python3
"""
Inject Clay settings into the Pebble emulator's localStorage.

Usage:
    python3 scripts/inject-emu-settings.py [settings-file] [platform]

Defaults:
    settings-file: emu-settings.json
    platform: emery
"""

import dbm.dumb
import json
import os
import sys
from pathlib import Path


def main():
    settings_file = sys.argv[1] if len(sys.argv) > 1 else "emu-settings.json"
    platform = sys.argv[2] if len(sys.argv) > 2 else "emery"

    with open("package.json", "r", encoding="utf-8") as file:
        package_json = json.load(file)
    app_uuid = package_json["pebble"]["uuid"]

    pebble_sdk_dir = Path.home() / "Library" / "Application Support" / "Pebble SDK"
    current_sdk = pebble_sdk_dir / "SDKs" / "current"

    if current_sdk.is_symlink():
        sdk_version = current_sdk.resolve().name
    else:
        versions = [
            directory.name
            for directory in pebble_sdk_dir.iterdir()
            if directory.is_dir() and directory.name[0].isdigit()
        ]
        sdk_version = sorted(versions)[-1] if versions else None

    if not sdk_version:
        print("Could not find Pebble SDK version", file=sys.stderr)
        sys.exit(1)

    emu_dir = pebble_sdk_dir / sdk_version / platform / "localstorage"
    db_path = emu_dir / app_uuid

    if not os.path.exists(settings_file):
        print(f"Settings file not found: {settings_file}", file=sys.stderr)
        print("\nExample emu-settings.json:", file=sys.stderr)
        print(
            json.dumps(
                {
                    "accountName": "your_librelinkup_email",
                    "password": "your_librelinkup_password",
                    "server": "europe",
                    "unit": "mmol",
                    "reversed": False,
                    "lowThreshold": 70,
                    "highThreshold": 180,
                    "vibeLowSoonEnabled": False,
                    "vibeLowSoonThreshold": 80,
                    "vibeLowSoonRepeatMinutes": 30,
                    "vibeEnabled": False,
                    "vibeHighThreshold": 250,
                    "vibeDelayMinutes": 60,
                    "vibeRepeatMinutes": 60,
                    "goodColor": "0x00AA55",
                    "warningColor": "0xFFAA00",
                    "alarmColor": "0xFF0000",
                    "pollIntervalMinutes": 5
                },
                indent=2
            ),
            file=sys.stderr
        )
        sys.exit(1)

    with open(settings_file, "r", encoding="utf-8") as file:
        settings = json.load(file)

    emu_dir.mkdir(parents=True, exist_ok=True)

    for extension in ["", ".dat", ".dir", ".bak"]:
        try:
            os.remove(str(db_path) + extension)
        except FileNotFoundError:
            pass

    database = dbm.dumb.open(str(db_path), "c")
    database["clay-settings"] = json.dumps(settings)
    database.close()

    print(f"Injected settings into {db_path}")
    print(f"App UUID: {app_uuid}")


if __name__ == "__main__":
    main()
