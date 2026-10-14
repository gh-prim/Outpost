# @outpost/ui

Outpost design system: tokens, light and dark themes, and base components.

## Direction

- Primary color: indigo (`#4F46E5` light, `#6366F1` dark).
- Neutrals: zinc. Dark theme is the default in the apps.
- HTTP methods: GET green, POST amber, PUT blue, PATCH purple, DELETE red.
- Fonts: Inter (UI) and JetBrains Mono (code), bundled with Fontsource so self-hosted instances never call an external font CDN.
- Dense layout: 14px base size, 6px radius.

## Usage (Tailwind CSS v4)

```css
@import "tailwindcss";
@import "@outpost/ui/styles.css";
@source "../../packages/ui/src";
```

Add `class="dark"` on `<html>` for the dark theme.

Utilities then use semantic names: `bg-background`, `text-muted-foreground`, `bg-primary`, `border-border`, `text-method-get`, and so on.

For non-CSS contexts (Monaco themes, charts), import raw values from `@outpost/ui/tokens`.

## Files

| File | Content |
|---|---|
| `src/styles/tokens.css` | CSS variables for both themes |
| `src/styles/theme.css` | Tailwind v4 theme mapping, fonts, base styles |
| `src/tokens.ts` | Same values as TypeScript constants |
| `src/components/*` | Base components (shadcn/ui style, built on Radix) |

## Components

Button, Input, Textarea, Label, Select, Checkbox, Switch, Tabs, Dialog, DropdownMenu, Tooltip, Card, Badge, Separator, Kbd, Spinner, plus two Outpost specific ones:

- `MethodBadge`: HTTP method label colored per method (`<MethodBadge method="DELETE" short />`).
- `StatusBadge`: response status colored by class (`<StatusBadge code={404} text="Not Found" />`).

```tsx
import { Button, MethodBadge } from "@outpost/ui";
```
