#!/usr/bin/env bash
set -euo pipefail
root="${1:-.}"
aggregates='yak-ops-engine-all|yak-ops-datasource-all|yak-ops-alarm-all|yak-ops-persistence-all'
violations="$({
  find "$root" -name pom.xml -not -path '*/target/*' -print0 |
    xargs -0 awk -v root="$root" -v allowed='(^|/)(yak-ops-boot|yak-ops-dist)/pom.xml$' -v aggregates="$aggregates" '
      FNR == 1 { relative=FILENAME; sub("^" root "/?", "", relative); permitted=(relative ~ allowed || relative == "pom.xml" || relative ~ ("(^|/)(" aggregates ")/pom.xml$")) }
      /<artifactId>/ && $0 ~ aggregates && !permitted { print relative ":" FNR ": aggregate dependency is restricted to yak-ops-boot or yak-ops-dist" }
    '
} || true)"
if [[ -n "$violations" ]]; then
  printf '%s\n' "$violations" >&2
  exit 1
fi

# Vendor adapters must not know HTTP contracts, and boot must select whole families.
if rg -n 'yak-ops-web-contract|io\.baize\.flow\.web\.contract' \
    "$root/yak-ops-datasource-plugins" --glob 'pom.xml' --glob '*.java'; then
  echo 'datasource vendor/support code must be transport-neutral' >&2
  exit 1
fi
if rg -n '<artifactId>yak-ops-(datasource-vendor-|alarm-vendor-|persistence-vendor-)' \
    "$root/yak-ops-boot/pom.xml"; then
  echo 'boot must select *-all aggregates, not concrete vendors' >&2
  exit 1
fi
