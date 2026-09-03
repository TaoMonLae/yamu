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
# set ADMIN_PASSWORD and ADMIN_SESSION_SECRET
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
ADMIN_PASSWORD=a-long-password
ADMIN_SESSION_SECRET=replace-with-output-from-openssl-rand-hex-32
APP_ORIGINS=https://yamumon.com,https://www.yamumon.com
TRUST_CLOUDFLARE_PROXY=true
DATA_DIR=/var/lib/mon-names
PORT=3002
```

Use a unique admin password with at least 12 characters. Generate the independent session secret with `openssl rand -hex 32`. Do not reuse the admin password as the session secret.

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

## 6. nginx + TLS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mon-name-converter
sudo ln -s /etc/nginx/sites-available/mon-name-converter /etc/nginx/sites-enabled/
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
