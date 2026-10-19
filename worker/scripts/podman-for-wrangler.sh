#!/usr/bin/env bash
# wrangler's image build passes flags some Podman versions reject; drop them for `build` only.
set -euo pipefail

readonly DROPPED_PROVENANCE_PREFIX="--provenance"
readonly DROPPED_LOAD_FLAG="--load"

filtered=()
isBuild=false
[ "${1:-}" = "build" ] && isBuild=true

for arg in "$@"; do
  if [ "$isBuild" = true ]; then
    case "$arg" in
      "$DROPPED_PROVENANCE_PREFIX" | "$DROPPED_PROVENANCE_PREFIX"=* | "$DROPPED_LOAD_FLAG") continue ;;
    esac
  fi
  filtered+=("$arg")
done

exec podman "${filtered[@]}"
