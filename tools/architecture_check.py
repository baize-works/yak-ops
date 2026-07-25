#!/usr/bin/env python3
"""Fail the build when a module introduces a new hexagonal-architecture violation.

The baseline records migration debt that predates the rule.  Entries disappear from
the baseline as code is moved; new entries are never accepted by the normal build.
"""

import argparse
import json
import re
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "tools" / "architecture-baseline.json"
NS = {"m": "http://maven.apache.org/POM/4.0.0"}
IMPORT = re.compile(r"^\s*import\s+(?:static\s+)?([^;]+);", re.MULTILINE)


def java_import_violations():
    rules = {
        "yak-ops-domain": (
            "domain-jdk-only",
            lambda name: not (name.startswith("java.") or name.startswith("javax.")),
        ),
        "yak-ops-application": (
            "application-boundary",
            lambda name: any(token in name for token in (
                ".dao.entity.", ".dao.repository.", ".web.contract.",
                ".engine.seatunnel.", ".engine.runtime.",
            )),
        ),
    }
    for module, (rule, forbidden) in rules.items():
        source = ROOT / module / "src"
        for path in sorted(source.rglob("*.java")) if source.exists() else ():
            for imported in IMPORT.findall(path.read_text(encoding="utf-8")):
                if forbidden(imported):
                    yield f"{rule}:{path.relative_to(ROOT)}:{imported}"

    # The infrastructure jar is a temporary physical container, not a license for
    # its adapters to form a second monolith.
    adapter_root = ROOT / "yak-ops-infrastructure" / "src" / "main" / "java"
    adapter_packages = {"persistence", "quartz", "engine", "alarm", "security"}
    for path in sorted(adapter_root.rglob("*.java")) if adapter_root.exists() else ():
        relative = path.relative_to(adapter_root)
        parts = relative.parts
        if len(parts) < 6 or tuple(parts[:4]) != ("io", "baize", "flow", "infrastructure"):
            continue
        owner = parts[4]
        if owner not in adapter_packages:
            continue
        for imported in IMPORT.findall(path.read_text(encoding="utf-8")):
            prefix = "io.baize.flow.infrastructure."
            if imported.startswith(prefix):
                target = imported[len(prefix):].split(".", 1)[0]
                if target in adapter_packages and target != owner:
                    yield f"adapter-isolation:{path.relative_to(ROOT)}:{imported}"


def dependencies(pom):
    root = ElementTree.parse(pom).getroot()
    node = root.find("m:dependencies", NS)
    if node is None:
        return
    for dependency in node.findall("m:dependency", NS):
        group = dependency.findtext("m:groupId", "", NS)
        artifact = dependency.findtext("m:artifactId", "", NS)
        if group == "io.baize.flow":
            yield artifact


def dependency_violations():
    forbidden = {
        "yak-ops-domain": None,  # no reactor dependency is allowed
        "yak-ops-application": {
            "yak-ops-dao", "yak-ops-web-contract", "yak-ops-engine-runtime",
            "yak-ops-engine-seatunnel",
        },
        "yak-ops-dao": {"yak-ops-web-contract"},
        "yak-ops-infrastructure": {"yak-ops-web-contract"},
        "yak-ops-datasource-plugins/yak-ops-datasource-support": {"yak-ops-web-contract"},
    }
    for pom in sorted(ROOT.rglob("pom.xml")):
        if any(part in {"target", ".git"} for part in pom.parts):
            continue
        module = str(pom.parent.relative_to(ROOT)) or "."
        deps = set(dependencies(pom))
        denied = forbidden.get(module, set())
        for artifact in sorted(deps):
            if (module == "yak-ops-domain" and artifact.startswith("yak-ops-")) or artifact in denied:
                yield f"dependency-boundary:{module}:{artifact}"
            if artifact.endswith("-all") and module not in {"yak-ops-boot", "yak-ops-dist"}:
                yield f"all-artifact-is-runtime-only:{module}:{artifact}"


def violations():
    return sorted(set(java_import_violations()) | set(dependency_violations()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-baseline", action="store_true")
    args = parser.parse_args()
    current = violations()
    if args.write_baseline:
        BASELINE.write_text(json.dumps(current, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {len(current)} existing violations to {BASELINE.relative_to(ROOT)}")
        return
    accepted = set(json.loads(BASELINE.read_text(encoding="utf-8")))
    introduced = sorted(set(current) - accepted)
    stale = sorted(accepted - set(current))
    if introduced:
        print("New architecture violations (do not add these to the baseline):")
        print("\n".join(f"  - {item}" for item in introduced))
        raise SystemExit(1)
    if stale:
        print("Architecture debt was removed; prune these stale baseline entries:")
        print("\n".join(f"  - {item}" for item in stale))
        raise SystemExit(1)
    print(f"Architecture check passed ({len(current)} migration-baseline entries).")


if __name__ == "__main__":
    main()
