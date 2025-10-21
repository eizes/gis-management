#!/bin/bash
BACKUP_DIR="/opt/gis-management/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"
su - postgres -c "pg_dump gis" | gzip > "$BACKUP_DIR/db-$TIMESTAMP.sql.gz"
tar -czf "$BACKUP_DIR/media-$TIMESTAMP.tar.gz" -C /opt/gis-management media/
echo "Backup erstellt: $TIMESTAMP"
