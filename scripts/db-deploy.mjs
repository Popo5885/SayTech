#!/usr/bin/env node
// Runs `prisma db push` against the production database on every deploy so the
// schema is always in sync with the Prisma model.
//
// Why: the start command on Railway used to skip this step, which meant tables
// like SiteSetting / WhatsAppLoginCode never existed in production. Every login
// or register page render then crashed with the cryptic Next.js digest error
// (e.g. "ERROR 1009408678") because the page's server component tried to query
// a missing table.
//
// Behavior:
//   - Skipped entirely when DATABASE_URL is missing (e.g. CI builds).
//   - Skipped when SKIP_DB_DEPLOY=1 (escape hatch for hot restarts).
//   - Logs failures but does NOT crash the start command, because we'd rather
//     boot the server (so the user sees a helpful error page) than block start.

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(repoRoot, "packages", "db", "prisma", "schema.prisma");

if (!process.env.DATABASE_URL) {
  console.warn("[db:deploy] skipped — DATABASE_URL is not set");
  process.exit(0);
}

if (process.env.SKIP_DB_DEPLOY === "1") {
  console.warn("[db:deploy] skipped — SKIP_DB_DEPLOY=1");
  process.exit(0);
}

console.log("[db:deploy] running prisma db push to sync schema…");

const child = spawn(
  "npx",
  [
    "--yes",
    "prisma",
    "db",
    "push",
    "--schema",
    schemaPath,
    "--accept-data-loss",
    "--skip-generate"
  ],
  {
    stdio: "inherit",
    cwd: repoRoot,
    env: process.env
  }
);

child.on("exit", (code) => {
  if (code === 0) {
    console.log("[db:deploy] schema sync complete");
    process.exit(0);
  }

  // Don't block startup — log loud and keep going.
  console.error(`[db:deploy] prisma db push failed with code ${code}; continuing so the server can start`);
  process.exit(0);
});

child.on("error", (error) => {
  console.error("[db:deploy] failed to spawn prisma:", error);
  process.exit(0);
});
