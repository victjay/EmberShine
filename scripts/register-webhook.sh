#!/usr/bin/env bash
# Register Telegram webhook URL with the Telegram Bot API.
# Run this once after deployment, and again any time the URL changes.
#
# Usage (reads from .env.local automatically):
#   bash scripts/register-webhook.sh
#
# Or with explicit values:
#   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... NEXT_PUBLIC_SITE_URL=... bash scripts/register-webhook.sh

set -euo pipefail

# Load .env.local if not already set
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
fi

TOKEN="${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is required}"
SECRET="${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET is required}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:?NEXT_PUBLIC_SITE_URL is required}"

WEBHOOK_URL="${SITE_URL}/api/telegram/${SECRET}"

echo "→ Registering webhook:"
echo "  URL: ${WEBHOOK_URL}"
echo ""

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"allowed_updates\": [\"message\", \"callback_query\"],
    \"drop_pending_updates\": true
  }")

echo "→ Telegram response:"
echo "${RESPONSE}"

# Check if it was successful
if echo "${RESPONSE}" | grep -q '"ok":true'; then
  echo ""
  echo "✓ Webhook registered successfully."
else
  echo ""
  echo "✗ Registration failed. Check token and site URL."
  exit 1
fi
