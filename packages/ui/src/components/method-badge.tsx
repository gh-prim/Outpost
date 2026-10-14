import * as React from "react";
import { cn } from "../lib/cn";

const methodClass: Record<string, string> = {
  GET: "text-method-get",
  POST: "text-method-post",
  PUT: "text-method-put",
  PATCH: "text-method-patch",
  DELETE: "text-method-delete",
};

const shortLabel: Record<string, string> = {
  DELETE: "DEL",
  OPTIONS: "OPT",
  PATCH: "PATCH",
};

export interface MethodBadgeProps extends React.ComponentProps<"span"> {
  method: string;
  /** Shorten long names (DELETE becomes DEL) for dense lists like the sidebar. */
  short?: boolean;
}

/** HTTP method label, colored per method. Used in the sidebar, tabs and request bar. */
export function MethodBadge({ method, short = false, className, ...props }: MethodBadgeProps) {
  const m = method.toUpperCase();
  return (
    <span
      data-slot="method-badge"
      className={cn(
        "inline-block font-mono text-[11px] font-semibold tracking-tight",
        methodClass[m] ?? "text-method-other",
        className,
      )}
      {...props}
    >
      {short ? (shortLabel[m] ?? m) : m}
    </span>
  );
}
