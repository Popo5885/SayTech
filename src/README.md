Railway legacy deploy trigger.

The production app source lives in `apps/web/src`. This marker exists so older
Railway watch-path settings that still point at `/src/**` can pick up one
deployment and then apply the root `railway.json` watch patterns for the
monorepo layout.
