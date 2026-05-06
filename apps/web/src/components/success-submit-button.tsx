"use client";

import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";

// Submit button with loading state and optional server-confirmed success checkmark.
// Pass done={true} only after a 200-OK server response to show the green check.
// For redirect-on-success flows (login etc.) omit done — navigation replaces the button.
export function SuccessSubmitButton({
  children,
  className = "",
  done = false
}: {
  children: React.ReactNode;
  className?: string;
  // When true the button collapses to a green circle with a checkmark.
  // Set this only after a confirmed 200-OK / success response from the server.
  done?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDone = done && !pending;

  return (
    <button
      aria-label={isDone ? "הצלחה" : undefined}
      className={`success-submit-btn ${isDone ? "done" : ""} ${className}`}
      disabled={pending || isDone}
      type="submit"
    >
      <span className="label">{pending ? "שולח..." : children}</span>
      <Check className="check-svg" aria-hidden="true" />
    </button>
  );
}
