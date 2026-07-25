#!/usr/bin/env python3
"""Inventory vendor coupling and prevent it from growing during staged removal."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKEN = re.compile(rb"seatunnel|sea_tunnel|zeta", re.IGNORECASE)
ZERO_SCOPES = ("yak-ops-domain/", "yak-ops-engine-contract/")


def tracked_files() -> list[str]:
    output = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [name.decode() for name in output.split(b"\0") if name]


def category(path: str) -> str:
    lower = path.lower()
    if lower.endswith(".java"):
        return "API" if any(part in lower for part in ("controller", "/api/", "/web/")) else "Java"
    if lower.endswith("pom.xml"):
        return "POM"
    if lower.endswith(".sql"):
        return "SQL"
    if lower.startswith("yak-ops-ui/"):
        return "UI"
    if lower.endswith((".yml", ".yaml", ".properties", ".env")) or "compose" in lower:
        return "Configuration"
    if lower.endswith((".md", ".adoc", ".txt")):
        return "Documentation"
    if "log" in Path(lower).name:
        return "Log"
    return "Other"


def matches() -> dict[str, int]:
    result: dict[str, int] = {}
    for name in tracked_files():
        try:
            count = len(TOKEN.findall((ROOT / name).read_bytes()))
        except OSError:
            continue
        if count:
            result[name] = count
    return result


def load_allowlist() -> list[re.Pattern[str]]:
    lines = (ROOT / "tools/engine-neutrality-allowlist.txt").read_text().splitlines()
    return [re.compile(line) for line in lines if line and not line.startswith("#")]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", action="store_true", help="print the classified ledger")
    args = parser.parse_args()
    found = matches()
    if args.inventory:
        totals = Counter(category(path) for path in found)
        print(json.dumps({"categories": dict(sorted(totals.items())), "files": found}, indent=2))
        return 0

    errors: list[str] = []
    for scope in ZERO_SCOPES:
        scoped = [path for path in found if path.startswith(scope)]
        if scoped:
            errors.append(f"zero-match scope {scope}: {', '.join(scoped)}")

    # Application is still being migrated. Freeze its current debt so every change can only
    # reduce it; changing this number requires an explicit review of the generated ledger.
    application_total = sum(count for path, count in found.items() if path.startswith("yak-ops-application/"))
    baseline = 595
    if application_total > baseline:
        errors.append(f"application vendor-token debt grew: {application_total} > {baseline}")

    allowlist = load_allowlist()
    for pattern in allowlist:
        if not any(pattern.search(path) for path in found):
            errors.append(f"stale allowlist entry: {pattern.pattern}")

    if errors:
        print("Engine-neutrality gate failed:\n- " + "\n- ".join(errors), file=sys.stderr)
        return 1
    print(f"Engine-neutrality gate passed (application staged debt: {application_total}/{baseline}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
