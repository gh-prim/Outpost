"use client";

import { Button, Checkbox, Input } from "@outpost/ui";
import type { Header } from "@/lib/collection-items";

export function HeadersEditor({
  headers,
  readOnly,
  onChange,
}: {
  headers: Header[];
  readOnly: boolean;
  onChange: (headers: Header[]) => void;
}) {
  const set = (index: number, changes: Partial<Header>) =>
    onChange(headers.map((h, i) => (i === index ? { ...h, ...changes } : h)));

  return (
    <div className="space-y-1.5">
      {headers.map((header, index) => (
        <div key={index} className="flex items-center gap-2">
          <Checkbox
            checked={!header.disabled}
            disabled={readOnly}
            onCheckedChange={(checked) => set(index, { disabled: checked !== true })}
            aria-label="Enabled"
          />
          <Input
            value={header.key}
            readOnly={readOnly}
            onChange={(e) => set(index, { key: e.target.value })}
            placeholder="Key"
            className="font-mono"
          />
          <Input
            value={header.value}
            readOnly={readOnly}
            onChange={(e) => set(index, { value: e.target.value })}
            placeholder="Value"
            className="font-mono"
          />
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(headers.filter((_, i) => i !== index))}
              aria-label="Remove header"
            >
              ×
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={() => onChange([...headers, { key: "", value: "" }])}>
          Add header
        </Button>
      )}
    </div>
  );
}
