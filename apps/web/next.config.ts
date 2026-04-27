import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(path.resolve(currentDir, "../.."));

const nextConfig: NextConfig = {
  transpilePackages: ["@lottery/core", "@lottery/db", "@lottery/ui"]
};

export default nextConfig;
