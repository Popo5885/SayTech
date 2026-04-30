"use client";

// Top-level error boundary for crashes that happen in the root layout itself
// (which the regular error.tsx can't catch). Provides a minimal usable page
// without depending on any layout, so the user is never left with a blank
// "ERROR <digest>" screen.

import { useEffect } from "react";

export default function GlobalErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui:global-error-boundary]", error);
  }, [error]);

  return (
    <html dir="rtl" lang="he">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#070914",
          color: "#ffffff",
          fontFamily: "Heebo, Arial, Helvetica, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px"
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 28,
            padding: 32,
            textAlign: "center"
          }}
        >
          <p style={{ margin: 0, fontWeight: 900, color: "#67e8f9", letterSpacing: 1 }}>Magic Flow</p>
          <h1 style={{ margin: "16px 0 0", fontSize: 32, fontWeight: 900 }}>העמוד נתקל בתקלה</h1>
          <p style={{ margin: "16px 0 0", lineHeight: 1.7, color: "#cbd5e1" }}>
            משהו קצר לרגע. אפשר לרענן או לפנות לתמיכה של Magic Flow.
          </p>
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                background: "#22d3ee",
                color: "#0f172a",
                border: 0,
                borderRadius: 16,
                padding: "12px 22px",
                fontWeight: 900,
                cursor: "pointer"
              }}
              type="button"
            >
              נסה שוב
            </button>
            <a
              href="tel:0542466340"
              style={{
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.4)",
                color: "#bbf7d0",
                borderRadius: 16,
                padding: "12px 22px",
                fontWeight: 900,
                textDecoration: "none"
              }}
            >
              חיוג מהיר לתמיכה: 054-246-6340
            </a>
          </div>
          {error?.digest ? (
            <p style={{ marginTop: 24, fontSize: 12, color: "#94a3b8" }}>
              קוד אבחון: <span dir="ltr">{error.digest}</span>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
