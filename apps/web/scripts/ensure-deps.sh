#!/bin/sh
# Keep the persistent /app/node_modules Docker volume in sync with package.json.
# A rebuilt image does NOT replace the contents of an existing named volume.
set -eu
cd /app
stamp="node_modules/.enjoy-package-sha256"
current="$(sha256sum package.json | awk '{print $1}')"
previous=""
if [ -f "$stamp" ]; then previous="$(cat "$stamp")"; fi
if [ "$current" != "$previous" ] || ! node -e '
  const p = require("./package.json");
  for (const dependency of Object.keys(p.dependencies || {})) {
    try { require.resolve(dependency); }
    catch (err) { process.stderr.write("Missing dependency: " + dependency + "\n"); process.exit(1); }
  }
' >/dev/null; then
  echo "[enjoy-life] Installing/syncing web dependencies in persisted Docker volume..."
  npm install --no-audit --no-fund
  # Fail loudly before Next.js starts if a dependency still cannot be resolved.
  node -e '
    const p = require("./package.json");
    for (const dependency of Object.keys(p.dependencies || {})) {
      require.resolve(dependency);
    }
    require.resolve("@tiptap/extension-image");
  '
  mkdir -p node_modules
  printf '%s\n' "$current" > "$stamp"
  echo "[enjoy-life] Web dependencies are ready."
else
  echo "[enjoy-life] Web dependencies already match package.json."
fi
