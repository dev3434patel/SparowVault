#!/usr/bin/env bash
# Daily mysqldump + optional off-site copy (PHASE_10).
# Cron example (03:15 UTC):
#   15 3 * * * /var/www/sparowvault/scripts/company/backup-daily.sh >> /var/log/sparowvault-backup.log 2>&1
#
# Required env (from systemd EnvironmentFile or crontab):
#   BACKUP_DIR=/var/backups/sparowvault   # absolute, outside web root, mode 700
#   BACKUP_OFFSITE_DIR=                  # optional second absolute path / mount
# Optional:
#   MYSQLDUMP_BIN=mysqldump
#   KEEP_DAYS=14
#   APP_ROOT=/var/www/sparowvault

set -euo pipefail

APP_ROOT="${APP_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$APP_ROOT"

if [[ -z "${BACKUP_DIR:-}" ]]; then
  echo "BACKUP_DIR is required (absolute path outside web root)" >&2
  exit 1
fi

export BACKUP_DIR
export MYSQLDUMP_BIN="${MYSQLDUMP_BIN:-mysqldump}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] backup:db start"
php scripts/backup_db.php
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] backup:db ok"

KEEP_DAYS="${KEEP_DAYS:-14}"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db_*.sql' -mtime +"$KEEP_DAYS" -delete || true
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db_*.json' -mtime +"$KEEP_DAYS" -delete || true

if [[ -n "${BACKUP_OFFSITE_DIR:-}" ]]; then
  mkdir -p "$BACKUP_OFFSITE_DIR"
  # Copy newest dump + manifest
  newest=$(ls -1t "$BACKUP_DIR"/db_*.sql 2>/dev/null | head -n1 || true)
  if [[ -n "$newest" ]]; then
    cp -p "$newest" "$BACKUP_OFFSITE_DIR/"
    [[ -f "${newest%.sql}.json" ]] && cp -p "${newest%.sql}.json" "$BACKUP_OFFSITE_DIR/"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] offsite copy -> $BACKUP_OFFSITE_DIR ($(basename "$newest"))"
  fi
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] backup-daily done"
