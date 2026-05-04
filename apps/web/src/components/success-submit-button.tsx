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
  done?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`success-submit-btn ${className}`}
      disabled={pending || done}
      type="submit"
    >
      {done ? (
        <span className="label flex items-center justify-center gap-2">
          <Check className="h-4 w-4" />
          {children}
        </span>
      ) : (
        <span className="label">{pending ? "שולח..." : children}</span>
      )}
      <Check className="check-svg" />
    </button>
  );
}
