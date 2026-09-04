# Ubuntu deploy

The app is a Next.js standalone Node process. SQLite and `names.json` live on disk.

## 1. Server packages

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. App directory

```bash
sudo mkdir -p /var/www/mon-name-converter /var/lib/mon-names
sudo chown "$USER":"$USER" /var/www/mon-name-converter /var/lib/mon-names
cd /var/www/mon-name-converter
git clone https://github.com/TaoMonLae/yamu.git yamu
cd yamu
cp .env.example .env.local
# Add the Clerk production keys and public application origins.
```

## 3. Build

```bash
cd /var/www/mon-name-converter/yamu
npm ci
npm run build
mkdir -p .next/standalone/public .next/standalone/.next/static
cp -a public/. .next/standalone/public/
cp -a .next/static/. .next/standalone/.next/static/
```

## 4. Environment

Create `/var/www/mon-name-converter/yamu/.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_replace_me
CLERK_SECRET_KEY=sk_live_replace_me
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/admin
APP_ORIGINS=https://yamumon.com,https://www.yamumon.com
TRUST_CLOUDFLARE_PROXY=true
DATA_DIR=/var/lib/mon-names
PORT=3002
```

Create a production instance for `yamumon.com` in Clerk, complete its DNS setup,
and use its `pk_live_` and `sk_live_` keys. Development `pk_test_` and `sk_test_`
keys are not suitable for this production deployment. Because the publishable
key is embedded in the client bundle, update `.env.local` before building.

Keep `TRUST_CLOUDFLARE_PROXY=true` only when firewall rules or Cloudflare Tunnel prevent visitors from reaching the origin directly. Otherwise, remove it so a client cannot spoof Cloudflare's visitor-IP header.

## 5. Process manager

```bash
cd /var/www/mon-name-converter/yamu
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
pm2 startup
```

The PM2 configuration starts Node with `--env-file`, so `.env.local` is parsed as a dotenv file rather than as a Bash script. Passwords and secrets may therefore contain shell punctuation without breaking startup. Do not run `source .env.local`.

The process binds to `127.0.0.1`, so port 3002 is not directly exposed. Keep that binding when nginx or Cloudflare Tunnel is the public entry point.
The PM2 configuration asks Node to resolve `localhost` over IPv4 first. This
works around a Next.js standalone middleware rewrite bug while retaining the
IPv4 loopback-only listener expected by nginx.

## 6. nginx + TLS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mon-name-converter
sudo ln -sfn /etc/nginx/sites-available/mon-name-converter /etc/nginx/sites-enabled/mon-name-converter
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yamumon.com -d www.yamumon.com
```

## Backup

Copy the catalog and branding files:

- `/var/lib/mon-names/names.db`
- `/var/lib/mon-names/names.json`
- `/var/lib/mon-names/branding.json`, when present
- `/var/lib/mon-names/branding/`, when present
