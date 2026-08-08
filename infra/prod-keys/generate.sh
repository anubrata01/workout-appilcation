#!/bin/sh
# Generates the production RS256 keypair used to sign/verify JWTs. Not
# committed to git (see .gitignore) — run this once on setup, or to rotate.
# After rotating, also update gateway/kong.prod.yml's rsa_public_key to
# match the new jwt-public.pem, or Kong will reject tokens signed with it.
set -e
cd "$(dirname "$0")"
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
echo "Generated jwt-private.pem / jwt-public.pem in $(pwd)"
echo "Now update gateway/kong.prod.yml's rsa_public_key to match jwt-public.pem."
