#!/bin/sh
set -eu

submission_user="${SUBMISSION_POSTGRES_USER:-submission_user}"
submission_password="${SUBMISSION_POSTGRES_PASSWORD:-secure_password_change_me}"
submission_db="${SUBMISSION_POSTGRES_DB:-submissions_db}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${submission_user}') THEN
        CREATE ROLE ${submission_user} LOGIN PASSWORD '${submission_password}';
    END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${submission_db} OWNER ${submission_user}'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${submission_db}')\gexec
SQL
