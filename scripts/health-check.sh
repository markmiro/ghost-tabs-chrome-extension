#!/usr/bin/env bash
# Runs every workflow the README promises, end to end, and prints one PASS/FAIL line per step.
#
#   pnpm health            # once
#   pnpm health --repeat 3 # run the browser tests 3 times to shake out flakiness
#
# Logs go to e2e/artifacts/health/<timestamp>/. Exit code is non-zero if any step failed.
set -uo pipefail

cd "$(dirname "$0")/.."
REPEAT=1
[[ "${1:-}" == "--repeat" ]] && REPEAT="${2:-1}"

STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
OUT="e2e/artifacts/health/$STAMP"
mkdir -p "$OUT"
FAILED=()

step() {
  local name="$1"
  shift
  local log="$OUT/$name.log"
  local start=$SECONDS
  if "$@" >"$log" 2>&1; then
    printf 'PASS  %-24s %4ss\n' "$name" $((SECONDS - start))
  else
    printf 'FAIL  %-24s %4ss  (%s)\n' "$name" $((SECONDS - start)) "$log"
    FAILED+=("$name")
  fi
}

# Every file the manifest points at must exist, and debug-only files must stay out of `build`.
check_build_output() {
  node -e '
    const fs = require("node:fs");
    const dir = process.argv[1];
    const m = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, "utf8"));
    const files = [
      m.background.service_worker,
      m.action.default_popup,
      ...Object.values(m.icons),
      ...Object.values(m.action.default_icon),
      ...m.content_scripts.flatMap((c) => c.js),
      ...m.web_accessible_resources.flatMap((r) => r.resources).filter((f) => !/debug/.test(f)),
    ];
    const missing = files.filter((f) => !fs.existsSync(`${dir}/${f}`));
    if (missing.length) throw new Error("missing from build: " + missing.join(", "));
    const debug = fs.readdirSync(dir, { recursive: true }).filter((f) => /(^|\/)(debug-|[^/]*-debug\.)/.test(f));
    if (debug.length) throw new Error("debug files leaked into build: " + debug.join(", "));
    console.log(`ok: ${files.length} manifest files present, no debug files`);
  ' build
}

# `pnpm watch` should produce a loadable `build-watch` (including debug files) and recopy edits.
check_watch() {
  rm -rf build-watch
  # Own process group, so cleanup only kills this watcher and not one from another checkout.
  set -m
  pnpm run watch &
  local pid=$!
  set +m
  local ok=1
  for _ in $(seq 1 60); do
    if [[ -f build-watch/manifest.json && -f build-watch/js/background.js && -f build-watch/js/content-script-debug.js && -f build-watch/popup-debug.html ]]; then
      ok=0
      break
    fi
    sleep 1
  done
  if [[ $ok -eq 0 ]]; then
    # Touch a copied asset and make sure the watcher notices.
    local before
    before=$(stat -f %m build-watch/popup.html)
    sleep 1.1
    touch src/popup.html
    ok=1
    for _ in $(seq 1 20); do
      [[ $(stat -f %m build-watch/popup.html) != "$before" ]] && ok=0 && break
      sleep 0.5
    done
    [[ $ok -ne 0 ]] && echo "watcher did not recopy src/popup.html"
  else
    echo "build-watch was not populated within 60s"
  fi
  kill -- "-$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  return $ok
}

e2e() {
  local dir="$1" i
  for i in $(seq 1 "$REPEAT"); do
    echo "=== run $i/$REPEAT against $dir"
    EXTENSION_DIR="$dir" E2E_ARTIFACTS_DIR="$OUT/e2e-$(basename "$dir")-$i" \
      node --test --test-concurrency=1 e2e/extension.e2e.mjs || return 1
  done
}

echo "health check $(git rev-parse --short HEAD) ($(git rev-parse --abbrev-ref HEAD)) -> $OUT"
step install pnpm install --frozen-lockfile
step typecheck pnpm run typecheck
step unit-tests pnpm test
step build pnpm run build
step build-output check_build_output
step e2e-build e2e build
step watch check_watch
step e2e-build-watch e2e build-watch

if ((${#FAILED[@]})); then
  echo "FAILED: ${FAILED[*]}"
  exit 1
fi
echo "ALL PASSED"
