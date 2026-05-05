#!/usr/bin/env bash
set -euo pipefail

# End-to-end smoke test for silent-build live stack.
# 1. Spawn a synthetic jsonl at /tmp/smoke-live.jsonl
# 2. Start live-server pointed at that file on port 3338
# 3. Open SSE connection via curl and assert snapshot + delta arrive
# 4. Fire an overlay trigger, assert SSE receives the trigger event
# 5. Cleanup

PORT=3338
TMP=/tmp/smoke-live-$$
TMP_JSONL=$TMP/session.jsonl
SSE_LOG=$TMP/sse.log
SERVER_PID_FILE=$TMP/server.pid
REPO=$(cd "$(dirname "$0")/.." && pwd)

mkdir -p "$TMP"
trap "kill \$(cat $SERVER_PID_FILE 2>/dev/null) 2>/dev/null || true; rm -rf $TMP" EXIT

# Synthesize a few events
ts() { date -u +"%Y-%m-%dT%H:%M:%S.%3NZ"; }
mk_user() {
  echo "{\"type\":\"user\",\"uuid\":\"u-$RANDOM\",\"parentUuid\":null,\"timestamp\":\"$(ts)\",\"message\":{\"role\":\"user\",\"content\":\"$1\"}}"
}

# Seed with 2 events so snapshot is non-empty
{
  mk_user "hello smoke"
  mk_user "another line"
} > "$TMP_JSONL"

# Start server
echo "[smoke] starting live-server on :$PORT"
cd "$REPO/packages/live-server"
nohup npx tsx src/cli.ts \
  --port $PORT \
  --jsonl "$TMP_JSONL" \
  --project-name "SMOKE" \
  --no-redactor \
  > "$TMP/server.log" 2>&1 &
echo $! > "$SERVER_PID_FILE"
cd "$REPO"

# Wait for listening
for i in 1 2 3 4 5 6 7 8; do
  if curl -sf "http://127.0.0.1:$PORT/api/health" > /dev/null 2>&1; then break; fi
  sleep 0.5
done

if ! curl -sf "http://127.0.0.1:$PORT/api/health" > /dev/null 2>&1; then
  echo "[smoke] FAIL: live-server never became healthy"
  cat "$TMP/server.log"
  exit 1
fi
echo "[smoke] live-server up"

# Start SSE listener in background
echo "[smoke] opening SSE stream"
curl -sN "http://127.0.0.1:$PORT/events" > "$SSE_LOG" 2>&1 &
SSE_PID=$!
sleep 1

# Append another event to trigger a delta
echo "[smoke] appending new event to jsonl"
mk_user "delta event" >> "$TMP_JSONL"
sleep 1

# Fire a trigger
echo "[smoke] POSTing trigger/phase?n=2"
curl -sf -X POST "http://127.0.0.1:$PORT/api/trigger/phase?n=2" > /dev/null

sleep 1

# Stop SSE
kill "$SSE_PID" 2>/dev/null || true
wait "$SSE_PID" 2>/dev/null || true

# Verify content
if ! grep -q '"kind":"snapshot"' "$SSE_LOG"; then
  echo "[smoke] FAIL: snapshot not received"
  cat "$SSE_LOG"
  exit 1
fi
if ! grep -q '"kind":"delta"' "$SSE_LOG"; then
  echo "[smoke] FAIL: delta not received"
  cat "$SSE_LOG"
  exit 1
fi
if ! grep -q '"kind":"trigger"' "$SSE_LOG"; then
  echo "[smoke] FAIL: trigger not received"
  cat "$SSE_LOG"
  exit 1
fi

SNAPSHOT_EVENTS=$(grep -oE '"kind":"snapshot"' "$SSE_LOG" | wc -l)
DELTA_EVENTS=$(grep -oE '"kind":"delta"' "$SSE_LOG" | wc -l)
TRIGGER_EVENTS=$(grep -oE '"kind":"trigger"' "$SSE_LOG" | wc -l)

echo "[smoke] OK"
echo "[smoke] snapshots=$SNAPSHOT_EVENTS deltas=$DELTA_EVENTS triggers=$TRIGGER_EVENTS"
