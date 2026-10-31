# Supabase root CA (PostgreSQL TLS verification)

The app verifies the PostgreSQL server certificate when it has a CA certificate.
If `DATABASE_SSL_CA` is not set in the config, the app uses the file
`electron/certs/supabase-ca.crt` that is packaged with the build.
If that file is missing, the connection is still encrypted but the server certificate
is **not** verified, and a warning is written to the log.

## Owner: add the certificate (one time)

1. Open the Supabase Dashboard for the production project.
2. Go to **Project Settings > Database** (Database settings), section **SSL Configuration**.
3. Click **Download certificate** ("SSL certificate"). The file is usually named `prod-ca-2021.crt`.
4. Save it in this folder as **`supabase-ca.crt`** (exact name).
5. Check that the file starts with `-----BEGIN CERTIFICATE-----`.
6. Build and release as usual (`npm run release`). The file is included in the installer
   (`certs/*.crt` in `package.json` > `build.files`).

The certificate is public (it is a CA certificate, not a secret), so it is safe to commit it.

## Notes

- `DATABASE_SSL_CA` in the config (PEM text or a file path) or the environment variable
  always takes precedence over the bundled file.
- `sslmode=disable` in `DATABASE_URL` turns TLS off and ignores the CA. Do not use it for Supabase.
- If the connection fails after adding the file with an error like
  `self-signed certificate in certificate chain` or `Hostname/IP does not match`,
  check that the certificate belongs to the same Supabase project and region, and that
  `DATABASE_URL` uses the Supabase host name (not an IP address).
- If Supabase rotates its CA, download the new certificate, replace this file and release again.
