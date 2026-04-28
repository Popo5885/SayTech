"use client";

import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";

export function SuccessSubmitButton({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`success-submit-btn ${className}`}
      disabled={pending}
      type="submit"
    >
      <span className="label">{pending ? "שולח..." : children}</span>
      <Check className="check-svg" />
    </button>
  );
}
