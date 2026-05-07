#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaCliPath = path.join("packages", "db", "prisma", "schema.prisma");
const envPath = path.join(repoRoot, ".env");

if (!process.env.DATABASE_URL && existsSync(envPath)) {
  const rawEnv = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  const databaseUrlLine = rawEnv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("DATABASE_URL="));

  if (databaseUrlLine) {
    const value = databaseUrlLine.slice("DATABASE_URL=".length).trim();
    process.env.DATABASE_URL = value.replace(/^["']|["']$/g, "");
  }
}

if (!process.env.DATABASE_URL) {
  console.log("[db:push:ci] DATABASE_URL not set - skipping schema push during build");
  process.exit(0);
}

console.log("[db:push:ci] pushing Prisma schema to database...");

const prismaArgs = [
  "--yes",
  "prisma",
  "db",
  "push",
  "--schema",
  schemaCliPath,
  "--accept-data-loss",
  "--skip-generate"
];

function windowsQuote(arg) {
  const value = String(arg);
  return /[\s"]/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

const child =
  process.platform === "win32"
    ? spawn(
        "cmd.exe",
        ["/d", "/s", "/c", ["npx", ...prismaArgs.map(windowsQuote)].join(" ")],
        {
          stdio: "inherit",
          cwd: repoRoot,
          env: process.env
        }
      )
    : spawn("npx", prismaArgs, {
        stdio: "inherit",
        cwd: repoRoot,
        env: process.env
      });

child.on("exit", (code) => {
  if (code === 0) {
    console.log("[db:push:ci] schema push complete");
    process.exit(0);
  }

  console.error(`[db:push:ci] prisma db push failed with exit code ${code}`);
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("[db:push:ci] failed to spawn prisma:", error.message);
  process.exit(1);
});
