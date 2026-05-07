"use client";

import { useEffect } from "react";
import { DatabaseErrorState } from "../../components/database-error-state";

export default function DashboardErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard:error-boundary]", error);
  }, [error]);

  return (
    <div className="space-y-4">
      <DatabaseErrorState retryHref="/dashboard" />
      <div className="text-center">
        <button
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          onClick={() => reset()}
          type="button"
        >
          רענון מהיר
        </button>
      </div>
    </div>
  );
}
