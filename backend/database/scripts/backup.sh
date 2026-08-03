#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)

docker exec -t dc_sms_portal_db \
pg_dump -U dcadmin dc_sms_portal_db \
> ../backups/backup_$DATE.sql

echo "Backup completed."