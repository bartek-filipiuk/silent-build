#!/usr/bin/env bash
set -euo pipefail

# Replay a recorded .jsonl into a fresh target file, line by line,
# with a configurable delay so live-server sees progressive deltas.
#
# Usage:
#   ./scripts/replay-session.sh <source.jsonl> <target.jsonl> [speed]
#   speed is events-per-second. default: 10 (fast; 138 events -> ~14s)

SRC=${1:?"source jsonl required"}
DST=${2:?"target jsonl required"}
EPS=${3:-10}           # events per second
SLEEP=$(awk "BEGIN { printf \"%.3f\", 1/$EPS }")

if [ ! -f "$SRC" ]; then
  echo "source not found: $SRC" >&2; exit 1
fi

# Start empty
: > "$DST"

LINES=$(wc -l < "$SRC")
echo "[replay] $LINES lines at ${EPS} eps (~$(awk "BEGIN { printf \"%.1fs\", $LINES/$EPS }"))"

i=0
while IFS= read -r line || [ -n "$line" ]; do
  i=$((i+1))
  printf '%s\n' "$line" >> "$DST"
  if [ $((i % 20)) -eq 0 ]; then
    echo "[replay] $i/$LINES"
  fi
  sleep "$SLEEP"
done < "$SRC"

echo "[replay] done: $LINES events streamed to $DST"
