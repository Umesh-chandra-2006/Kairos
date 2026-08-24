# Kairos production provisioning ($0, Oracle Cloud Always Free)

Single always-on VM running everything in Docker: MySQL + Redis + API (which also
serves the built web preview) + Caddy (TLS). Target cost: $0/month.

## 1. Create the Oracle Cloud VM

1. Sign up at https://cloud.oracle.com (always-free tier; you must give a card but it is not charged).
2. Console → **Compute → Instances → Create instance**:
   - **Image**: Ubuntu 24.04 (or Canonical Ubuntu latest).
   - **Shape**: choose the **Always Free eligible** ARM shape (Ampere A1, up to 4 OCPU / 24 GB RAM). If none available in your home region, try another region with capacity ("Capacity unavailable" is a known free-tier annoyance; retry or pick a different region).
   - **Boot volume**: increase to ~100 GB (free tier includes 200 GB total block storage).
   - **Add SSH key**: add your public key.
   - Create, then under the instance **reserve a public IPv4** (Virtual Cloud Networks → IP management → Reserve public IP) so the address never changes. **Do not stop/terminate the instance** — reserved IPs are only free while the instance is running.
3. **Security list / NSG**: allow ingress on `22/tcp`, `80/tcp`, `443/tcp` from `0.0.0.0/0`.
4. SSH in: `ssh ubuntu@<PUBLIC_IP>`.

## 2. Install Docker + Compose

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git curl dnsutils
sudo usermod -aG docker ubuntu
# log out and back in (or: newgrp docker)
```

## 3. DuckDNS hostname (free)

1. Create an account at https://www.duckdns.org and register `kairos`.
2. Set the A record to the VM's public IP: `https://www.duckdns.org/update?domains=kairos&token=<YOUR_TOKEN>&ip=<PUBLIC_IP>` (you can also run their update cron script; the IP is reserved so one update is enough).
3. Check it resolves: `dig +short kairos.duckdns.org`.

## 4. Deploy the app

```bash
git clone https://github.com/<you>/kairos.git /srv/kairos
cd /srv/kairos
git pull --ff-only origin main
```

Create `/srv/kairos/deploy/.env` (git-ignored; this is your secrets file — chmod 600):

```bash
MYSQL_ROOT_PASSWORD=<random>
MYSQL_PASSWORD=<random>
APP_URL=https://kairos.duckdns.org
JWT_SECRET=<openssl rand -hex 64>
OPENROUTER_API_KEY=<your openrouter key>
# Optional (defaults shown):
# OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
# OPENROUTER_FAST_MODEL=meta-llama/llama-3.1-8b-instruct:free
RESEND_API_KEY=<your resend key>
# Optional but recommended for push notifications:
# WEB_PUSH_PUBLIC_KEY=<npx web-push generate-vapid-keys>
# WEB_PUSH_PRIVATE_KEY=<...>
# WEB_PUSH_SUBJECT=mailto:you@example.com
# EMAIL_FROM=Kairos <onboarding@resend.dev>
# OCI_BUCKET=kairos-backups   # only needed for backups (section 6)
```

Generate a fresh `JWT_SECRET`:
```bash
openssl rand -hex 64
```

Build and start (migrations run automatically on boot):
```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

Watch logs until `API listening`:
```bash
docker compose -f deploy/docker-compose.prod.yml logs -f api
```

Verify:
```bash
curl -fsS https://kairos.duckdns.org/healthz   # {"ok":true}
curl -fsS https://kairos.duckdns.org/readyz    # {"ok":true,"checks":{"db":true,"redis":true}}
```

## 5. Update flow (after pushing to main)

```bash
cd /srv/kairos && git pull --ff-only origin main && docker compose -f deploy/docker-compose.prod.yml up -d --build
```

## 6. Backups (nightly → Oracle Object Storage, free)

1. Install the OCI CLI and configure it (needs Tenancy OCID, User OCID, region, API key):
   ```bash
   curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh | bash
   oci setup config
   oci setup repair-file-permissions --file ~/.oci/config
   ```
2. Create a bucket:
   ```bash
   oci os bucket create --name kairos-backups --compartment-id <COMPARTMENT_OCID>
   ```
3. Add `OCI_BUCKET=kairos-backups` to `/srv/kairos/deploy/.env`.
4. Add the cron job:
   ```bash
   crontab -e
   # 0 3 * * * /bin/bash /srv/kairos/deploy/backup.sh >> /srv/kairos/kairos-backup.log 2>&1
   ```
   Test once by hand first: `bash /srv/kairos/deploy/backup.sh`.

## 7. Mobile beta (invite-only, no app stores)

The app defaults to `https://kairos.duckdns.org`; a tester can also point the app at a
different server in **Settings → Server** (persisted, no rebuild needed).

- **Android — direct APK**: build once, share the file/QR with invitees.
  ```bash
  cd apps/mobile
  npx eas login                    # one-time, free account
  npx eas init                     # one-time; creates the project and prints EXPO_PUBLIC_EAS_PROJECT_ID
  npx eas build -p android --profile preview
  ```
  The `preview` profile (`eas.json`) produces an installable APK. For push notifications
  to work, put the printed project ID in `apps/mobile/.env`:
  ```bash
  EXPO_PUBLIC_API_URL=https://kairos.duckdns.org
  EXPO_PUBLIC_EAS_PROJECT_ID=<your-expo-project-id>
  ```
  (`.env` is git-ignored; rebuild with `--profile preview` after changing it.)
- **iOS — Expo Go**: no store fee needed for the beta. Testers install Expo Go from the
  App Store and scan the QR from `npx expo start`. A production standalone iOS build
  requires a $99 Apple Developer account — defer until the level-up trigger.

## Known $0 limits (by design)

- **Email**: without a real domain, Resend's sandbox can only deliver to your own
  verified inbox. Verification/reset emails will not reach other users — tell beta
  testers not to lose their password.
- **AI eval**: OpenRouter free models are rate-limited and occasionally flaky. The
  server caches each question's model answer in Redis, so repeat evals are free and
  fast. Expect occasional `failed` evals during free-tier rate limits.
- **Single instance**: the eval worker and daily scheduler run inside the API process,
  so run exactly one replica. `/readyz` gates the load balancer on DB + Redis.
- **Leveling up**: when traction justifies it — buy a real domain, move
  `APP_URL`, enable real email (Resend + verified domain), and if needed migrate the
  whole stack to a managed PaaS. Nothing in the app hard-codes the hostname.
