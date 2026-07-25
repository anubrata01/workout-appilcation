# Dev JWT keypair

Run once after cloning:

```bash
bash generate.sh
```

(or on Windows without a shell: `openssl genrsa -out jwt-private.pem 2048` then `openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem`)

This produces `jwt-private.pem` (Auth Service only) and `jwt-public.pem` (every other service). Both are gitignored — never commit a private key, even a throwaway dev one.

If you regenerate the pair, update `gateway/kong.yml`'s `rsa_public_key` value to match the new public key, or Kong's JWT plugin will reject every token.
