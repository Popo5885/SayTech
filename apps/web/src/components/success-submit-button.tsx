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
  // When true the button coll