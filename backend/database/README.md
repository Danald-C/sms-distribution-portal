# Database

This directory contains everything related to the lifecycle of the PostgreSQL database.

## Structure

migrations/
- Database schema changes.
- Executed in version order.

seeds/
- Initial application data.
- Safe to run on a new database.

scripts/
- Database utilities.
- Backup, restore and maintenance scripts.

backups/
- Local backup storage.
- Not committed to Git.

## Principles

- Never modify an existing migration after it has been applied.
- Every schema change gets a new migration.
- Seed data is separate from schema.
- Production databases are updated only through migrations.