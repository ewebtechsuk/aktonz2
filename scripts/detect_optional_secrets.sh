#!/usr/bin/env bash
set -euo pipefail

has_apex_key=false

if [[ -n "${APEX27_API_KEY:-}" ]]; then
  has_apex_key=true
else
  printf '::notice::APEX27_API_KEY is not configured. Using bundled fixture data instead of live API listings.\n'
fi

if [[ -n "${APEX27_BRANCH_ID:-}" ]]; then
  printf 'APEX27_BRANCH_ID provided; listings cache will be branch scoped.\n'
fi

printf 'has-apex-key=%s\n' "$has_apex_key" >> "$GITHUB_OUTPUT"
