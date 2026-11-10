#!/usr/bin/env bash
# Deploys this repo to the Mira Railway project as service "mira" and prints the public URL.
set -euo pipefail
cd "$(dirname "$0")/.."
export RAILWAY_CALLER=skill:use-railway@1.2.2
PROJECT=0e6b3298-b035-4612-836c-051457c2116a
ENVIRONMENT=918ae323-2563-44da-9065-d6a711636044

railway link --project "$PROJECT" --environment "$ENVIRONMENT"
KEY=$(grep '^YOUCAM_API_KEY=' .env | cut -d= -f2-)
railway service list --json | grep -q '"mira"' || railway add --service mira --variables "YOUCAM_API_KEY=$KEY" --json </dev/null
railway service link mira
railway variable set "YOUCAM_API_KEY=$KEY" --service mira --skip-deploys
railway up --service mira --detach -m "Mira: YouCam Skin AI and VTO in iMessage"
railway domain --service mira --json || true
