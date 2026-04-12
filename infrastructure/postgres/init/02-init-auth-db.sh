#!/bin/sh
set -eu

auth_user="${AUTH_POSTGRES_USER:-auth_user}"
auth_password="${AUTH_POSTGRES_PASSWORD:-auth_password}"
auth_db="${AUTH_POSTGRES_DB:-auth_db}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${auth_user}') THEN
        CREATE ROLE ${auth_user} LOGIN PASSWORD '${auth_password}';
    END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${auth_db} OWNER ${auth_user}'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${auth_db}')\gexec
SQL
