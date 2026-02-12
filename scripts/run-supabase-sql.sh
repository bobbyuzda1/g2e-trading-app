#!/usr/bin/env bash
# Run SQL against Supabase via the Management API.
# Usage:
#   bash scripts/run-supabase-sql.sh <sql-file>       # Run a .sql file
#   bash scripts/run-supabase-sql.sh -q "SELECT 1;"   # Run inline query
#
# Requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in .env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] || [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF must be set in .env"
  exit 1
fi

API_URL="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query"

if [ "${1:-}" = "-q" ]; then
  SQL="${2:?Usage: $0 -q \"SQL query\"}"
elif [ -n "${1:-}" ] && [ -f "$1" ]; then
  SQL=$(cat "$1")
else
  echo "Usage:"
  echo "  $0 <file.sql>          Run a SQL file"
  echo "  $0 -q \"SELECT 1;\"     Run inline SQL"
  exit 1
fi

# Escape the SQL for JSON
JSON_SQL=$(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<< "$SQL")

RESPONSE=$(curl -s --max-time 30 "$API_URL" \
  -X POST \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": ${JSON_SQL}}")

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
