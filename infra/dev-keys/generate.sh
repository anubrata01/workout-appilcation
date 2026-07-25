#!/bin/sh
# Regenerates the local dev-only RS256 keypair used to sign/verify JWTs across
# all four services (TRD 1.3). Not committed to git — run this once after
# cloning. Never use this pair, or this generation method, for staging/prod;
# those keys belong in a real secrets manager.
set -e
cd "$(dirname "$0")"
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
echo "Generated jwt-private.pem / jwt-public.pem in $(pwd)"
echo "If you change these, also update gateway/kong.yml's rsa_public_key to match."
