#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(repoRoot, "packages", "db", "prisma", "schema.prisma");

if (!process.env.DATABASE_URL) {
  console.log("[db:push:ci] DATABASE_URL not set — skipping schema push during build");
  process.exit(0);
}

console.log("[db:push:ci] pushing Prisma schema to database…");

const child = spawn(
  "npx",
  ["--yes", "prisma", "db", "push", "--schema", schemaPath, "--accept-data-loss", "--skip-generate"],
  { stdio: "inherit", cwd: repoRoot, env: process.env }
);

child.on("exit", (code) => {
  if (code === 0) {
    console.log("[db:push:ci] schema push complete");
    process.exit(0);
  }
  console.error(`[db:push:ci] prisma db push failed with exit code ${code}`);
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("[db:push:ci] failed to spawn prisma:", error);
  process.exit(1);
});
