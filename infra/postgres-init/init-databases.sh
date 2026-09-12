#!/bin/bash
# Runs automatically on first container start (postgres image convention).
# One Postgres instance holding 4 logically-separate databases for local dev —
# TRD 5 notes this is fine to start with as long as no service ever queries
# another's database; splitting into separate instances later is an infra
# change only, not a data-model change.
set -e

for db in auth_db workout_db analytics_db notif_db nutrition_db; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE $db OWNER $POSTGRES_USER;
EOSQL
done
