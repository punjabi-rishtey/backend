# punjabi-rishtey-backend

## Environment

Copy [`.env.example`](.env.example) to `.env` and set at least `MONGO_URI`, **`JWT_SECRET`** (member tokens), and **`ADMIN_JWT_SECRET`** (admin tokens). For local demo data, use [`.env.demo.example`](.env.demo.example) and `npm run dev:demo`.

Future production secret rotation (no values in repo): [docs/jwt-secret-rotation-runbook.md](docs/jwt-secret-rotation-runbook.md).
