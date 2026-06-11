#!/usr/bin/env bash
# deploy-and-capture.sh — end-to-end: build/push → deploy → record → summarise.
#
# Usage:
#   bash deploy-and-capture.sh                # full flow, defaults
#   bash deploy-and-capture.sh --no-deploy    # capture only (assumes already deployed)
#   bash deploy-and-capture.sh --quiet        # less log output
#
# After this script runs you'll have a fresh captures/run-<ts>/ directory
# with desktop + mobile videos, stills, and analysis frames.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

# Load tokens
if [[ -f ~/.hermes/.env ]]; then
  set -a; source ~/.hermes/.env; set +a
fi

DEPLOY=true
QUIET=false
for arg in "$@"; do
  case "$arg" in
    --no-deploy) DEPLOY=false ;;
    --quiet)     QUIET=true ;;
  esac
done

log() { [[ "$QUIET" == true ]] || echo "[deploy-and-capture] $*" >&2; }

# ---------- 1. git add + commit + push (if any changes) ----------
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  if [[ -z "$(git status --porcelain)" ]]; then
    log "no local changes"
  else
    log "committing local changes…"
    git add -A
    git -c user.email=project99sp@gmail.com -c user.name="Amos" \
        commit -m "chore: pre-deploy snapshot"
    source ~/.hermes/.env
    git push origin main
  fi
else
  log "no local changes to commit"
fi

# ---------- 2. deploy to Vercel ----------
if [[ "$DEPLOY" == true ]]; then
  log "deploying to Vercel…"
  if [[ -z "${VERCEL_TOKEN:-}" ]]; then
    log "ERROR: VERCEL_TOKEN not set; source ~/.hermes/.env or pass --no-deploy"
    exit 1
  fi
  vercel deploy --prod --yes --token "$VERCEL_TOKEN" 2>&1 \
    | grep -E "(Production|Alias|Error|Ready)" || true
fi

# Wait a moment for the CDN edge to pick up the new deploy
sleep 3

# ---------- 3. record ----------
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="captures/run-${TS}"
log "recording → $OUT"
python3 capture.py --out "$OUT" --scroll-duration 12 --fps 20 --frames 12

log "done → $OUT"
log "  desktop video: $OUT/desktop.webm"
log "  mobile video:  $OUT/mobile.webm"
log "  stills:        $OUT/*.png"
log "  frames:        $OUT/{desktop,mobile}-frames/"
log "  summary:       $OUT/summary.json"
