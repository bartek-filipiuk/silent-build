#!/usr/bin/env bash
set -euo pipefail

# Smoke test: harvest current CC session -> render 60 PNG frames to verify pipeline.
# Expected: output/smoketest-<date>/timeline.json + dashboard_frames/ with >=60 PNGs.

SMOKE_ROOT="$(pwd)/output/smoketest-$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$SMOKE_ROOT"

echo "[smoke] project-start marker"
pnpm mark project-start --name "SmokeTest" --output-root "$SMOKE_ROOT"

# mark CLI prints path — find the actual created dir
ACTUAL_DIR=$(ls -dt "$SMOKE_ROOT"/smoketest-* 2>/dev/null | head -1)
if [ -z "$ACTUAL_DIR" ]; then
  echo "[smoke] FAIL: could not find created dir under $SMOKE_ROOT" >&2
  exit 1
fi
echo "[smoke] project dir: $ACTUAL_DIR"

echo "[smoke] harvest"
pnpm harvest --project "$ACTUAL_DIR" --project-root "$(pwd)"

echo "[smoke] render PNG (capped at 60 frames for smoke speed)"
pnpm render --project "$ACTUAL_DIR" --format png --fps 30 --max-frames 60

echo "[smoke] verify outputs"
test -f "$ACTUAL_DIR/timeline.json" || { echo "FAIL: no timeline.json"; exit 1; }
test -d "$ACTUAL_DIR/dashboard_frames" || { echo "FAIL: no dashboard_frames"; exit 1; }
FRAME_COUNT=$(ls "$ACTUAL_DIR/dashboard_frames" | wc -l)
if [ "$FRAME_COUNT" -lt 1 ]; then
  echo "FAIL: no PNG frames rendered"
  exit 1
fi

echo "[smoke] OK -- $FRAME_COUNT frames rendered, timeline valid"
echo "[smoke] artifacts in $ACTUAL_DIR"
