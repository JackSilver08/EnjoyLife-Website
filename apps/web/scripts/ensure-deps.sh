#!/bin/sh
# Keep the persistent /app/node_modules Docker volume in sync with package.json.
# A rebuilt image does NOT replace the contents of an existing named volume.
set -eu
cd /app
stamp="node_modules/.enjoy-package-sha256"
current="$(sha256sum package.json | awk '{print $1}')"
previous=""
if [ -f "$stamp" ]; then previous="$(cat "$stamp")"; fi
# Checking the on-disk package is safer than require.resolve for packages such as
# @tiptap/pm, which intentionally do not export their package root.
deps_present() {
  node -e '
    const fs = require("node:fs");
    const dependencies = Object.keys(require("./package.json").dependencies || {});
    for (const name of dependencies) {
      if (!fs.existsSync("node_modules/" + name + "/package.json")) {
        process.stderr.write("Missing installed dependency: " + name + "\n");
        process.exit(1);
      }
    }
    // Confirm the precise image extension from the user's crash can be resolved.
    require.resolve("@tiptap/extension-image");
  '
}
if [ "$current" != "$previous" ] || ! deps_present; then
  echo "[enjoy-life] Installing/syncing web dependencies in persisted Docker volume..."
  npm install --no-audit --no-fund
  deps_present
  mkdir -p node_modules
  printf '%s\n' "$current" > "$stamp"
  echo "[enjoy-life] Web dependencies are ready."
else
  echo "[enjoy-life] Web dependencies already match package.json."
fi
