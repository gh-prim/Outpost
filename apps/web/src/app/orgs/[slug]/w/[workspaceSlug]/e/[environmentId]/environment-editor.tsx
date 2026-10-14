"use client";

import { Button, Card, Checkbox, Input, Switch } from "@outpost/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Value = { key: string; value: string; type: "default" | "secret"; enabled: boolean };

export function EnvironmentEditor(props: {
  environmentId: string;
  workspaceHref: string;
  workspaceName: string;
  initial: { name: string; values: Value[]; version: number };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(props.initial.name);
  const [values, setValues] = useState<Value[]>(props.initial.values);
  const [version, setVersion] = useState(props.initial.version);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, changes: Partial<Value>) {
    setValues((current) => current.map((v, i) => (i === index ? { ...v, ...changes } : v)));
    setDirty(true);
  }

  async function save() {
    setError(null);
    try {
      const saved = await apiFetch<{ name: string; values: Value[]; version: number }>(
        `/environments/${props.environmentId}`,
        { method: "PUT", body: { name, values: values.filter((v) => v.key.trim()), baseVersion: version } },
      );
      setValues(saved.values);
      setVersion(saved.version);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove() {
    if (!confirm(`Delete the environment ${name}?`)) return;
    await apiFetch(`/environments/${props.environmentId}`, { method: "DELETE" });
    router.push(props.workspaceHref);
  }

  function exportFile() {
    // Secrets are exported empty, like other API clients do, so the file is safe to share.
    const data = { name, values: values.map((v) => ({ ...v, value: v.type === "secret" ? "" : v.value })) };
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    link.download = `${name}.environment.json`;
    link.click();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2.5">
        <Link href={props.workspaceHref}>← {props.workspaceName}</Link>
      </Button>
      <div className="mt-4 flex items-center gap-3">
        <Input
          value={name}
          readOnly={!props.canEdit}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          className="h-9 max-w-80 text-lg font-semibold"
          aria-label="Environment name"
        />
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={exportFile}>
            Export
          </Button>
          {props.canEdit && (
            <>
              <Button variant="ghost" className="text-destructive" onClick={remove}>
                Delete
              </Button>
              <Button onClick={save} disabled={!dirty}>
                {dirty ? "Save" : "Saved"}
              </Button>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-destructive">{error}</p>}

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2 font-medium">Variable</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Secret</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {values.map((v, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">
                  <Checkbox
                    checked={v.enabled}
                    disabled={!props.canEdit}
                    onCheckedChange={(checked) => update(i, { enabled: checked === true })}
                    aria-label="Enabled"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    value={v.key}
                    readOnly={!props.canEdit}
                    onChange={(e) => update(i, { key: e.target.value })}
                    className="font-mono"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-1">
                    <Input
                      type={v.type === "secret" && !revealed.has(i) ? "password" : "text"}
                      value={v.value}
                      readOnly={!props.canEdit}
                      onChange={(e) => update(i, { value: e.target.value })}
                      className="font-mono"
                    />
                    {v.type === "secret" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setRevealed((current) => {
                            const next = new Set(current);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          })
                        }
                      >
                        {revealed.has(i) ? "Hide" : "Show"}
                      </Button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <Switch
                    checked={v.type === "secret"}
                    disabled={!props.canEdit}
                    onCheckedChange={(secret) => update(i, { type: secret ? "secret" : "default" })}
                    aria-label="Secret"
                  />
                </td>
                <td className="px-1">
                  {props.canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove variable"
                      onClick={() => {
                        setValues((current) => current.filter((_, j) => j !== i));
                        setDirty(true);
                      }}
                    >
                      ×
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {props.canEdit && (
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setValues((current) => [...current, { key: "", value: "", type: "default", enabled: true }]);
                setDirty(true);
              }}
            >
              Add variable
            </Button>
          </div>
        )}
      </Card>
      <p className="mt-3 text-muted-foreground">
        Secret values are encrypted in the database, hidden from viewers and never shown in published documentation.
      </p>
    </div>
  );
}
