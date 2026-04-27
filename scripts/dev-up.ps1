$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "Starting PostgreSQL container..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
try {
  npm run db:generate
} catch {
  Write-Host "Prisma generation failed. On Windows, rerun this script from an elevated PowerShell terminal." -ForegroundColor Yellow
  throw
}

Write-Host "Pushing Prisma schema..." -ForegroundColor Cyan
npx prisma db push --schema packages/db/prisma/schema.prisma

Write-Host "Starting web and worker apps..." -ForegroundColor Cyan
npm run dev
