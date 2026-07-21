#!/usr/bin/env bash
# Idempotent Hostinger VPS setup for snap-expense.
# Run as a user with sudo (not root-only). Review variables before first run.
#
# Usage:
#   curl -fsSL ... | bash   # or copy to the server and:
#   chmod +x deploy/hostinger-setup.sh
#   ./deploy/hostinger-setup.sh
#
set -euo pipefail

# --- Config (override via env before running) ---
APP_DIR="${APP_DIR:-$HOME/snap-expense}"
REPO_URL="${REPO_URL:-https://github.com/allenjosh1983/snap-expense.git}"
BRANCH="${BRANCH:-main}"
NODE_MAJOR="${NODE_MAJOR:-20}"
PM2_APP_NAME="snap-expense"

echo "==> snap-expense VPS setup"
echo "    APP_DIR=$APP_DIR"
echo "    REPO_URL=$REPO_URL"
echo "    BRANCH=$BRANCH"

# --- System packages (Debian/Ubuntu-style Hostinger VPS) ---
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw
fi

# --- Node.js ${NODE_MAJOR} via NodeSource (skip if already installed) ---
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_MAJOR" ]]; then
  echo "==> Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
echo "    Node $(node -v), npm $(npm -v)"

# --- PM2 (global, for process management) ---
if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  sudo npm install -g pm2
fi

# --- Clone or update repo ---
if [[ -d "$APP_DIR/.git" ]]; then
  echo "==> Pulling latest $BRANCH"
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  echo "==> Cloning repo into $APP_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# --- Env file reminder (never commit secrets) ---
if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example — EDIT BEFORE FIRST USE"
  cp .env.example .env
  echo "    Required: GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_SHEETS_ID, PORT=3000"
  echo "    Upload credentials JSON to e.g. $APP_DIR/credentials/google-service-account.json"
fi

# --- Install deps and build ---
echo "==> npm ci && npm run build"
npm ci
npm run build

# --- PM2: start or restart ---
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  echo "==> Restarting PM2 app $PM2_APP_NAME"
  pm2 restart ecosystem.config.cjs --update-env
else
  echo "==> Starting PM2 app $PM2_APP_NAME"
  pm2 start ecosystem.config.cjs
fi

pm2 save

# Persist PM2 across reboot (run once; safe to re-run)
if ! systemctl is-enabled pm2-"$(whoami)" >/dev/null 2>&1; then
  pm2 startup systemd -u "$(whoami)" --hp "$HOME" | tail -1 | sudo bash || true
fi

echo ""
echo "==> App should be listening on http://127.0.0.1:3000"
echo "    Next: configure nginx (deploy/nginx-snap-expense.conf.example), certbot, and firewall."
echo "    See docs/DEPLOY-VPS.md for full steps."
