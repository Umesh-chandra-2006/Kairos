#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

# The OCI CLI installs to ~/bin and only adds it to an interactive .bashrc;
# cron does not source that, so put it on PATH explicitly.
export PATH="$HOME/bin:$PATH"

# Load just the variables this script needs from the deploy .env, so it can run
# from cron without a login shell (values are read defensively, never sourced).
if [ -f deploy/.env ]; then
  MYSQL_PASSWORD=$(grep -E '^MYSQL_PASSWORD=' deploy/.env | head -n1 | cut -d= -f2-)
  OCI_BUCKET=$(grep -E '^OCI_BUCKET=' deploy/.env | head -n1 | cut -d= -f2-)
fi

: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required (set it in deploy/.env or the environment)}"
: "${OCI_BUCKET:?OCI_BUCKET is required (an Oracle Object Storage bucket name)}"

STAMP=$(date +%Y%m%d_%H%M%S)
TMP_FILE="/tmp/kairos-db-${STAMP}.sql.gz"

echo "Dumping kairos database..."
# pipefail + set -e makes a failed mysqldump abort before anything is uploaded.
docker compose -f deploy/docker-compose.prod.yml exec -T mysql \
  sh -c 'exec mysqldump -ukairos -p"$MYSQL_PASSWORD" --single-transaction --routines --triggers kairos' \
  | gzip > "$TMP_FILE"

# Verify the archive is intact before shipping it to OCI.
gzip -t "$TMP_FILE"

echo "Uploading to OCI Object Storage bucket '$OCI_BUCKET'..."
oci os object put --bucket-name "$OCI_BUCKET" --file "$TMP_FILE" --name "kairos/db-${STAMP}.sql.gz" --force

rm -f "$TMP_FILE"
echo "Backup complete: kairos/db-${STAMP}.sql.gz"
