import * as React from "react";
import { cn } from "./utils";

const palette = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  neutral: "bg-stone-100 text-stone-700",
  danger: "bg-red-100 text-red-700"
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof palette;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        palette[tone],
        className
      )}
      {...props}
    />
  );
}
