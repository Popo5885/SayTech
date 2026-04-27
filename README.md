# WhatsApp Lottery & Referral SaaS

Greenfield monorepo for a multi-tenant WhatsApp lottery SaaS with:

- `apps/web`: Next.js dashboard and public campaign pages
- `apps/wa-worker`: WhatsApp session manager, campaign engine, and queue workers
- `packages/core`: shared domain types, helpers, and business rules
- `packages/db`: Prisma schema and database client
- `packages/ui`: reusable UI primitives

## First-Run Outline

1. Install dependencies with `npm install`
2. Use the included `.env` or copy `.env.example` to `.env`
3. Start PostgreSQL with `docker-compose up -d`
4. Run `npm run db:generate`
5. Push the schema with `npm run db:push`
6. Start the app with `npm run dev`

For Windows local setup, `npm run setup:dev` runs the full flow in one PowerShell script.
