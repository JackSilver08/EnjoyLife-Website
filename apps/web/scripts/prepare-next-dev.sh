#!/bin/sh
# Next.js 16 dev output is transient. A persistent /app/.next Docker volume can
# contain incomplete JSON manifests left by an interrupted compilation/restart,
# resulting in: JSON.parse -> loadManifest -> Unexpected end of JSON input.
#
# Start from clean GENERATED manifests, while retaining the safe shared cache.
# This runs only in the web container before Next starts. Do NOT delete the
# volume or run docker compose down -v: those operations risk application data.
set -eu
cd /app
if [ -d .next ]; then
  echo "[enjoy-life] Clearing stale Next.js dev manifests before launch..."
  find .next -mindepth 1 -maxdepth 1 ! -name cache -exec rm -rf -- {} +
else
  mkdir -p .next
fi
# Avoid deleting the mount itself: .next may be a Docker named volume.
echo "[enjoy-life] Next.js manifests ready; dependency/build cache preserved."
