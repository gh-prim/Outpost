// Raw token values, for places CSS variables cannot reach
// (Monaco editor themes, charts, emails). Keep in sync with styles/tokens.css.

export type ThemeName = "light" | "dark";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const fonts = {
  sans: '"Inter Variable", ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, monospace',
} as const;

export const radius = "0.375rem";

export const colors = {
  light: {
    background: "#ffffff",
    foreground: "#18181b",
    card: "#ffffff",
    popover: "#ffffff",
    sidebar: "#fafafa",
    primary: "#4f46e5",
    primaryForeground: "#ffffff",
    secondary: "#f4f4f5",
    muted: "#f4f4f5",
    mutedForeground: "#71717a",
    accent: "#eef2ff",
    accentForeground: "#3730a3",
    success: "#16a34a",
    warning: "#d97706",
    destructive: "#dc2626",
    border: "#e4e4e7",
    input: "#d4d4d8",
    ring: "#6366f1",
  },
  dark: {
    background: "#09090b",
    foreground: "#fafafa",
    card: "#111113",
    popover: "#18181b",
    sidebar: "#0c0c0e",
    primary: "#6366f1",
    primaryForeground: "#ffffff",
    secondary: "#27272a",
    muted: "#1c1c1f",
    mutedForeground: "#a1a1aa",
    accent: "#1e1b4b",
    accentForeground: "#c7d2fe",
    success: "#22c55e",
    warning: "#f59e0b",
    destructive: "#ef4444",
    border: "#27272a",
    input: "#3f3f46",
    ring: "#818cf8",
  },
} as const satisfies Record<ThemeName, Record<string, string>>;

export const methodColors = {
  light: {
    GET: "#15803d",
    POST: "#b45309",
    PUT: "#1d4ed8",
    PATCH: "#7e22ce",
    DELETE: "#b91c1c",
    other: "#52525b",
  },
  dark: {
    GET: "#4ade80",
    POST: "#fbbf24",
    PUT: "#60a5fa",
    PATCH: "#c084fc",
    DELETE: "#f87171",
    other: "#a1a1aa",
  },
} as const;

export function methodColor(method: string, theme: ThemeName = "dark"): string {
  const key = method.toUpperCase() as HttpMethod;
  return methodColors[theme][key] ?? methodColors[theme].other;
}
