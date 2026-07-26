-- One-time local setup for native Windows PostgreSQL (not the Docker path —
-- that one auto-creates the role via POSTGRES_USER/POSTGRES_PASSWORD, see
-- init-databases.sh). Run this once as the postgres superuser:
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -f infra\postgres-init\windows-local-setup.sql
-- matches the credentials already baked into every service's .env.example.

CREATE ROLE loaded WITH LOGIN PASSWORD 'loaded';

CREATE DATABASE auth_db OWNER loaded;
CREATE DATABASE workout_db OWNER loaded;
CREATE DATABASE analytics_db OWNER loaded;
CREATE DATABASE notif_db OWNER loaded;
