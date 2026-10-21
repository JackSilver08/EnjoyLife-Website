# Windows CRLF startup fix

On Windows, an existing Git checkout can mount `apps/web/scripts/ensure-deps.sh` with CRLF line endings. Alpine `/bin/sh` sees the trailing carriage return after `set -eu` as part of an invalid shell option and exits immediately:

```
scripts/ensure-deps.sh: set: line 4: illegal option -
```

This is **not** a missing package or a PostgreSQL problem.

The `web` Docker Compose command now normalizes CRLF on **input**, not by mutating the Windows file:

```sh
tr -d '\015' < scripts/ensure-deps.sh | sh
```

`.gitattributes` specifies LF for future shell-script checkouts. The runtime normalization also covers existing Windows worktrees that have not been renormalized.

The Docker CI job:
1. Forces the bind-mounted startup script to CRLF.
2. Deletes a Tiptap package from the existing persistent npm volume.
3. Runs the recovery script through the same normalization pipeline.
4. Starts the **full Docker Compose stack** and waits for web, API, and PostgreSQL health.
5. Confirms `/api/health` is OK and `@tiptap/extension-image` resolves inside the web container.

## Windows PowerShell

```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate web
docker compose ps
docker compose logs web --tail=80
```

Do **not** use `docker compose down -v`: it deletes PostgreSQL storage. Use `docker compose logs --tail=120 web` if the web container is still unhealthy.
