import * as React from "react";
import { cn } from "../lib/cn";

function statusClass(code: number) {
  if (code >= 500) return "bg-destructive/15 text-destructive";
  if (code >= 400) return "bg-warning/15 text-warning";
  if (code >= 300) return "bg-accent text-accent-foreground";
  if (code >= 200) return "bg-success/15 text-success";
  return "bg-muted text-muted-foreground";
}

export interface StatusBadgeProps extends React.ComponentProps<"span"> {
  code: number;
  text?: string;
}

/** HTTP response status, e.g. "200 OK", colored by status class. */
export function StatusBadge({ code, text, className, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn("inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-xs font-semibold", statusClass(code), className)}
      {...props}
    >
      {code}
      {text ? <span className="font-medium">{text}</span> : null}
    </span>
  );
}
