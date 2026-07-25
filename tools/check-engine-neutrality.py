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
BASELINE_FILE = ROOT / "tools/engine-neutrality-baseline.json"
INVENTORY_EXCLUDES = {"tools/engine-neutrality-baseline.json"}


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
        # The snapshot contains matching path names by design and must not inventory itself.
        if name in INVENTORY_EXCLUDES:
            continue
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


def load_baseline() -> dict[str, int]:
    data = json.loads(BASELINE_FILE.read_text())
    if not isinstance(data, dict) or any(
        not isinstance(path, str) or not isinstance(count, int) or count < 1
        for path, count in data.items()
    ):
        raise ValueError(f"invalid engine-neutrality baseline: {BASELINE_FILE}")
    return data


def growth_errors(
    found: dict[str, int], baseline: dict[str, int], allowlist: list[re.Pattern[str]]
) -> list[str]:
    """Return findings that add vendor vocabulary outside a compatibility boundary."""
    errors: list[str] = []
    for path, count in sorted(found.items()):
        if any(pattern.search(path) for pattern in allowlist):
            continue
        previous = baseline.get(path, 0)
        if count > previous:
            errors.append(f"vendor-token debt grew in {path}: {count} > {previous}")
    return errors


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

    allowlist = load_allowlist()
    baseline = load_baseline()
    errors.extend(growth_errors(found, baseline, allowlist))
    for pattern in allowlist:
        if not any(pattern.search(path) for path in found):
            errors.append(f"stale allowlist entry: {pattern.pattern}")

    if errors:
        print("Engine-neutrality gate failed:\n- " + "\n- ".join(errors), file=sys.stderr)
        return 1
    print(
        "Engine-neutrality gate passed "
        f"(staged debt: {sum(found.values())}/{sum(baseline.values())})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
