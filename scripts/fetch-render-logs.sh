#!/bin/bash
# Fetch logs from Render for the G2E backend service
# Usage:
#   ./scripts/fetch-render-logs.sh              # Last 100 log entries
#   ./scripts/fetch-render-logs.sh 30m          # Last 30 minutes
#   ./scripts/fetch-render-logs.sh 4h           # Last 4 hours
#   ./scripts/fetch-render-logs.sh 1d           # Last 1 day
#   ./scripts/fetch-render-logs.sh errors       # Only error-level logs
#   ./scripts/fetch-render-logs.sh errors 4h    # Only error-level logs (last 4h)
#   ./scripts/fetch-render-logs.sh save         # Save output to logs/ directory
#   ./scripts/fetch-render-logs.sh save 2h      # Save last 2 hours to file

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

RENDER_API_KEY="${RENDER_API_KEY:-}"
RENDER_SERVICE_ID="${RENDER_SERVICE_ID:-srv-d623eckoud1c73990jvg}"
RENDER_OWNER_ID="${RENDER_OWNER_ID:-tea-d6239fig5rbc73et61fg}"

if [ -z "$RENDER_API_KEY" ]; then
    echo "Error: RENDER_API_KEY not set."
    echo "Add it to your .env file:  RENDER_API_KEY=rnd_xxxxx"
    exit 1
fi

# Pass all args through to the python script
exec python3 "$SCRIPT_DIR/fetch_render_logs.py" \
    --api-key "$RENDER_API_KEY" \
    --service-id "$RENDER_SERVICE_ID" \
    --owner-id "$RENDER_OWNER_ID" \
    --project-root "$PROJECT_ROOT" \
    "$@"
