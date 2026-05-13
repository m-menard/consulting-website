#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Building TypeScript..."
npm run build

echo "Restarting application..."
bash scripts/production.sh restart

echo "Deployment finished!"