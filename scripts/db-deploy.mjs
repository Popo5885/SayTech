#!/usr/bin/env node
// Runs `prisma db push` at start-time so the schema is always in sync.
//
// With db:push:ci now running at BUILD time (when DATABASE_URL is available)
// this script acts as a safety net for hot-restarts and environments where the
// build was done without a DATABASE_URL (e.g. local dev).
//
// Behavior:
//   - Skipped when DATABASE_URL is missing.
//   - Skipped when SKIP_DB_DEPLOY=1 (escape hatch for hot restarts).
//   - Exits with code 1 on failure so Railway marks the deploy as failed and
//     surfaces the real error in logs instead of booting a broken server.

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

console.log("[db:deploy] syncing schema with prisma db push…");

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
    console.log("[db:deploy] schema sync complete ✓");
    process.exit(0);
  }

  // Fail loudly — a server with missing tables serves 500s on every page.
  // Better to abort the start and show the real error in Railway logs.
  console.error(`[db:deploy] prisma db push failed with exit code ${code}`);
  console.error("[db:deploy] Verify DATABASE_URL is correct and the DB user has DDL permissions.");
  process.exit(1);
});

child.on("error", (error) => {
  console.error("[db:deploy] failed to spawn prisma:", error.message);
  process.exit(1);
});
