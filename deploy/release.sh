#!/usr/bin/env bash
set -euo pipefail

release_tag="${1:-}"
app_dir="/var/www/mon-name-converter/yamu"

if [[ ! "$release_tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Refusing to deploy invalid stable release tag: $release_tag" >&2
  exit 1
fi

cd "$app_dir"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Refusing to deploy over tracked changes in $app_dir." >&2
  exit 1
fi

release_commit="$(git rev-parse --verify "$release_tag^{commit}")"
echo "Deploying $release_tag ($release_commit)"

git checkout --detach "$release_commit"
npm ci
npm run build

mkdir -p .next/standalone/public .next/standalone/.next/static
cp -a public/. .next/standalone/public/
cp -a .next/static/. .next/standalone/.next/static/

pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save

curl --fail --silent --show-error --retry 8 --retry-delay 2 \
  http://127.0.0.1:3002/ > /dev/null

echo "Deployment health check passed."
