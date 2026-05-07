import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type PrismaClient = import("@prisma/client").PrismaClient;

const require = createRequire(import.meta.url);
const currentDir = path.dirname(fileURLToPath(import.meta.url));

declare global {
  var __lotteryPrisma__: PrismaClient | undefined;
}

let prismaInstance: PrismaClient | undefined;
let workspaceEnvLoaded = false;

function findWorkspaceEnv(startDir: string): string | null {
  let current = startDir;

  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = path.join(current, ".env");

    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  return null;
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed
    .slice(0, separatorIndex)
    .trim()
    .replace(/^\uFEFF/, "");
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (!key) {
    return null;
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function loadEnvFileSafely(envPath: string): void {
  const contents = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");

  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);

    if (!parsed) {
      continue;
    }

    const [key, value] = parsed;

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadWorkspaceEnv(): void {
  if (workspaceEnvLoaded || process.env.DATABASE_URL) {
    return;
  }

  const envPath = findWorkspaceEnv(currentDir);

  if (!envPath) {
    workspaceEnvLoaded = true;
    return;
  }

  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile(envPath);
    }
  } catch (error) {
    console.warn("[lottery-db:load-envfile-fallback]", error);
  }

  if (!process.env.DATABASE_URL) {
    loadEnvFileSafely(envPath);
  }

  workspaceEnvLoaded = true;
}

function createPrismaClient(): PrismaClient {
  try {
    loadWorkspaceEnv();
    const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

    return new PrismaClient({
      log: ["warn", "error"]
    });
  } catch (error) {
    throw new Error(
      'Prisma Client is not generated yet. Make sure root .env contains DATABASE_URL, start PostgreSQL, then run "npm run db:generate" from an elevated terminal on Windows before starting the DB-backed app.',
      {
        cause: error
      }
    );
  }
}

export function getPrisma(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  prismaInstance = globalThis.__lotteryPrisma__ ?? createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalThis.__lotteryPrisma__ = prismaInstance;
  }

  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrisma() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  }
});

export type { PrismaClient };
