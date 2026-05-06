import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const scannedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".json",
  ".prisma",
  ".md",
  ".css"
]);
const ignoredDirectories = new Set([
  ".git",
  ".claude",
  ".next",
  ".next_backup_20260425223826",
  ".turbo",
  "node_modules",
  "public",
  "uploads"
]);
const suspiciousPatterns = [
  /׳[-¿]/,
  /ג‚|ג€™|ג€|ג€�/,
  /ֲ©|ֲ·/,
  /ï»¿/,
  /�/
];

function extensionOf(path) {
  const match = path.match(/(\.[^.\\\/]+)$/);
  return match?.[1] ?? "";
}

function collectFiles(directory, output = []) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      collectFiles(fullPath, output);
      continue;
    }

    if (scannedExtensions.has(extensionOf(fullPath))) {
      output.push(fullPath);
    }
  }

  return output;
}

const failures = [];

for (const file of collectFiles(root)) {
  if (relative(root, file).replace(/\\/g, "/") === "scripts/check-utf8-hebrew.mjs") {
    continue;
  }

  const buffer = readFileSync(file);
  const text = buffer.toString("utf8");

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    failures.push(`${relative(root, file)}: contains UTF-8 BOM`);
  }

  if (!buffer.equals(Buffer.from(text, "utf8"))) {
    failures.push(`${relative(root, file)}: is not valid UTF-8`);
  }

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      failures.push(`${relative(root, file)}: contains suspicious mojibake (${pattern})`);
      break;
    }
  }
}

if (failures.length > 0) {
  console.error("Hebrew UTF-8 check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Hebrew UTF-8 check passed.");
