#!/usr/bin/env bash
# Simple curl-based smoke tests for the Swagger UI and OpenAPI spec
# Assumes the Flask server is running on http://127.0.0.1:5000
BASE_URL=${BASE_URL:-http://127.0.0.1:5000}

set -euo pipefail

echo "Checking /openapi.yaml..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/openapi.yaml")
if [ "$HTTP_CODE" != "200" ]; then
  echo "FAILED: /openapi.yaml returned $HTTP_CODE" >&2
  exit 1
fi

echo "/openapi.yaml OK"

echo "Checking /swagger..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/swagger")
if [ "$HTTP_CODE" != "200" ]; then
  echo "FAILED: /swagger returned $HTTP_CODE" >&2
  exit 1
fi

echo "/swagger OK"

# Optional login test — change email/password if you have a test user
TEST_EMAIL=${TEST_EMAIL:-test@example.com}
TEST_PASS=${TEST_PASS:-secret}

echo "Testing POST /api/auth/login (note: requires user to exist)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASS\"}")

if [ "$HTTP_CODE" = "200" ]; then
  echo "Login OK"
else
  echo "Login returned $HTTP_CODE (ensure test user exists)"
fi

echo "Done"
