#!/usr/bin/env bash
# Table test for podman-for-wrangler.sh, with a PATH shim standing in for podman.
set -uo pipefail

scriptDir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
wrapper="$scriptDir/podman-for-wrangler.sh"

shimDir="$(mktemp -d)"
trap 'rm -rf "$shimDir"' EXIT
cat > "$shimDir/podman" <<'SHIM'
#!/usr/bin/env bash
for a in "$@"; do printf '%s\n' "$a"; done
echo "STDIN:"
cat
SHIM
chmod +x "$shimDir/podman"
export PATH="$shimDir:$PATH"

failures=0

# runCase <name> <stdin text> <expected argv, space-joined> -- <args...>
runCase() {
  local name="$1" stdinText="$2" expected="$3"
  shift 4
  local out argv
  out="$(printf '%s' "$stdinText" | bash "$wrapper" "$@")"
  argv="$(printf '%s\n' "$out" | sed '/^STDIN:$/,$d' | tr '\n' ' ' | sed 's/ $//')"
  local stdinSeen="${out#*STDIN:$'\n'}"
  if [ "$argv" != "$expected" ]; then
    echo "FAIL $name: got '$argv' want '$expected'"; failures=$((failures + 1)); return
  fi
  if [ -n "$stdinText" ] && [ "$stdinSeen" != "$stdinText" ]; then
    echo "FAIL $name: stdin '$stdinSeen' want '$stdinText'"; failures=$((failures + 1)); return
  fi
  echo "ok   $name"
}

runCase "a: build drops --load and --provenance=false" "" \
  "build -t img:1 --platform linux/amd64 -f - ctx" -- \
  build --load -t img:1 --platform linux/amd64 --provenance=false -f - ctx
runCase "b: build without dropped flags unchanged" "" \
  "build -t img:1 -f - ctx" -- build -t img:1 -f - ctx
runCase "c1: push unchanged" "" "push img:1" -- push img:1
runCase "c2: tag unchanged" "" "tag a b" -- tag a b
runCase "c3: login unchanged" "" "login --password-stdin -u x reg" -- \
  login --password-stdin -u x reg
runCase "d: build passes stdin through" "FROM scratch" \
  "build -t img:1 -f - ctx" -- build --load -t img:1 -f - ctx

[ "$failures" -eq 0 ] || { echo "$failures case(s) failed"; exit 1; }
