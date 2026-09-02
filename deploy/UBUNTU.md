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
ADMIN_SESSION_SECRET=a-longer-random-string
DATA_DIR=/var/lib/mon-names
PORT=3002
```

## 5. Process manager

```bash
cd /var/www/mon-name-converter/yamu
set -a
source .env.local
set +a
pm2 start .next/standalone/server.js --name mon-name-converter --cwd /var/www/mon-name-converter/yamu/.next/standalone
pm2 save
pm2 startup
```

The process reads `DATA_DIR` from the environment. If PM2 does not inherit `.env.local`, export the variables in an ecosystem file:

```js
module.exports = {
  apps: [
    {
      name: "mon-name-converter",
      cwd: "/var/www/mon-name-converter/yamu/.next/standalone",
      script: "server.js",
      env: {
        PORT: 3002,
        DATA_DIR: "/var/lib/mon-names",
        ADMIN_PASSWORD: "a-long-password",
        ADMIN_SESSION_SECRET: "a-longer-random-string",
      },
    },
  ],
};
```

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
