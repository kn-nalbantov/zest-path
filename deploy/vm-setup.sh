#!/usr/bin/env bash
# Run on the Ubuntu Azure VM after copying the ZestPath project and a filled-in .env
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi

if [[ ! -f .env ]]; then
  echo "Create .env from .env.example first (GEMINI_API_KEY, CLIENT_URL, FE_PORT=80)."
  exit 1
fi

sudo docker compose up -d --build
sudo docker compose ps
echo "Health: http://$(curl -s ifconfig.me)/api/health"
