#!/usr/bin/env bash
# Manual Supabase backup — exports diary_entries and inbox_messages tables.
# Auto-scheduling comes in Phase 4.
#
# Usage:
#   SUPABASE_DB_PASSWORD=... bash scripts/backup-supabase.sh
#
# Or reads from .env.local automatically:
#   bash scripts/backup-supabase.sh

set -euo pipefail

if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
fi

DB_PASSWORD="${SUPABASE_DB_PASSWORD:?SUPABASE_DB_PASSWORD is required}"
# Supabase direct connection host format: db.<project-ref>.supabase.co
DB_HOST="${SUPABASE_DB_HOST:-db.lddoqrgolyyshazhiuib.supabase.co}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).dump"

echo "→ Exporting Supabase tables to ${BACKUP_FILE}..."

PGPASSWORD="${DB_PASSWORD}" pg_dump \
  "postgresql://postgres:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/postgres" \
  --table=diary_entries \
  --table=inbox_messages \
  --table=draft_posts \
  --table=profiles \
  -Fc \
  -f "${BACKUP_FILE}"

echo "✓ Backup saved: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
