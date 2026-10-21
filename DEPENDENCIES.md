# Dependency manifest / environment status

## Needed on the user's Windows machine
- Docker Desktop + WSL2 feature/virtualization (Windows 10/11)
- Internet to download Docker image layers, Go modules and npm dependencies
- Optional: VS Code / Git

## Images fetched automatically by `docker compose up --build`
- `postgres:17-alpine`
- `golang:1.25-alpine`
- `node:22-alpine`

## Go modules (first container startup)
- `github.com/gin-gonic/gin@v1.10.1`
- `github.com/jackc/pgx/v5@v5.7.6`
- Their transitive dependencies, resolved by `go mod tidy`.

## npm packages (Docker build)
- Next.js, React, React DOM, lucide-react
- TypeScript, ESLint, eslint-config-next, Tailwind CSS/PostCSS, @types packages
- Their transitive dependencies, resolved by `npm install`.

## Known limitation of this delivery
The authoring sandbox cannot resolve registry.npmjs.org / proxy.golang.org and does not have Docker Engine. Therefore:
- `node_modules`, `go.sum`, `package-lock.json` and Docker image layers could not be downloaded or validated here;
- actual container run, full frontend build, Go API integration build and database migrations are not claimed as passed;
- static TS/TSX syntax transcription and standalone Go rules unit tests are executed successfully.

Before opening to customers, pin/review dependencies, introduce CI, implement secure admin auth, real payment integration with verified webhook, returns/shipments, backups and production infra.
