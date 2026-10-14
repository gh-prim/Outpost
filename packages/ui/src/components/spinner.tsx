import * as React from "react";
import { cn } from "../lib/cn";

export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
