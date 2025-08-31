#!/usr/bin/env bash
set -euo pipefail

API_BASE=${API_BASE:-http://localhost:8000/api}
ORIGIN=${ORIGIN:-http://localhost:3000}
EMAIL=${EMAIL:-test@test.com}
PASSWORD=${PASSWORD:-admin123}
DOCKER_DB_CONTAINER=${DOCKER_DB_CONTAINER:-viaticos_db}

fail=false
require_200() {
  local code="$1"; local name="$2"
  if [[ "$code" != "200" ]]; then
    echo "[FAIL] $name → HTTP $code"; fail=true; else echo "[OK] $name"; fi
}

echo "[1/6] Building frontend (TypeScript/ESLint)"
pushd "$(dirname "$0")/../frontend" >/dev/null
npm run build >/dev/null 2>&1 || { echo "Frontend build failed"; exit 1; }
popd >/dev/null

echo "[2/6] Backend health"
HEALTH_CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Origin: $ORIGIN" "$API_BASE/health")
require_200 "$HEALTH_CODE" "/health"

echo "[3/6] Login to API"
LOGIN_JSON=$(curl -s -S -X POST "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"'"$EMAIL"'","password":"'"$PASSWORD"'"}')

ACCESS_TOKEN=$(printf '%s' "$LOGIN_JSON" | python3 - <<'PY'
import sys, json, re
raw=sys.stdin.read()
try:
  data=json.loads(raw)
  print(data.get('access_token',''))
except Exception:
  m=re.search(r'"access_token"\s*:\s*"([^"]+)"', raw)
  print(m.group(1) if m else '')
PY
)

# Fallback to sed if still empty
if [[ -z "$ACCESS_TOKEN" ]]; then
  ACCESS_TOKEN=$(printf '%s' "$LOGIN_JSON" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
fi

if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "Login failed or access_token missing"
  echo "$LOGIN_JSON"
  exit 1
fi

auth_hdr=( -H "Authorization: Bearer $ACCESS_TOKEN" )
origin_hdr=( -H "Origin: $ORIGIN" )

echo "[4/6] Auth check (/auth/me)"
ME_CODE=$(curl -s -o /dev/null -w '%{http_code}' "${auth_hdr[@]}" "${origin_hdr[@]}" "$API_BASE/auth/me")
require_200 "$ME_CODE" "/auth/me"

echo "[5/6] Preflight checks"
curl -s -S -o /dev/null -D - -X OPTIONS "$API_BASE/prepayments/" \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: authorization,content-type' \
  "${origin_hdr[@]}" | grep -i "access-control-allow-origin" || true

echo "[6/6] Authorized GET checks"
for path in \
  "$API_BASE/prepayments/" \
  "$API_BASE/expense-reports/?limit=1" \
  "$API_BASE/expenses/?limit=1" \
  "$API_BASE/dashboard/stats"; do
  echo "- GET $path"
  out=$(curl -s -S -o /dev/null -D - "$path" "${auth_hdr[@]}" "${origin_hdr[@]}")
  code=$(printf '%s' "$out" | awk '/^HTTP\//{code=$2} END{print code}')
  cors=$(printf '%s' "$out" | awk 'tolower($0) ~ /access-control-allow-origin/ {print "yes"; found=1} END{if(!found) print "no"}')
  echo "HTTP $code CORS:$cors"
  if [[ "$code" != "200" ]]; then fail=true; fi
done

echo "---"
# Optional DB schema check (via docker, if present)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DOCKER_DB_CONTAINER}$"; then
  echo "DB schema check (optional)"
  docker exec -i "$DOCKER_DB_CONTAINER" psql -U postgres -d viaticos -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='prepayments' AND column_name='rejection_reason'" | grep -q 1 \
    && echo "[OK] prepayments.rejection_reason present" \
    || { echo "[WARN] prepayments.rejection_reason missing"; }
fi

if $fail; then
  echo "Validation finished with failures."; exit 1
else
  echo "Validation finished successfully."; exit 0
fi

