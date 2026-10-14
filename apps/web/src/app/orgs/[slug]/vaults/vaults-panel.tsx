"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Vault = {
  id: string;
  name: string;
  type: string;
  config: { address?: string; region?: string; namespace?: string };
};

export function VaultsPanel({ organizationId, vaults }: { organizationId: string; vaults: Vault[] }) {
  const router = useRouter();
  const [type, setType] = useState<"hashicorp" | "aws">("hashicorp");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; length?: number } | null>(null);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const value = (name: string) => String(new FormData(form).get(name) ?? "").trim();
    setError(null);
    try {
      await apiFetch(`/organizations/${organizationId}/vaults`, {
        method: "POST",
        body:
          type === "hashicorp"
            ? {
                type,
                name: value("name"),
                address: value("address"),
                namespace: value("namespace") || undefined,
                token: value("token"),
              }
            : {
                type,
                name: value("name"),
                region: value("region"),
                accessKeyId: value("accessKeyId"),
                secretAccessKey: value("secretAccessKey"),
              },
      });
      form.reset();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(vault: Vault) {
    if (!confirm(`Delete ${vault.name}? Environment values that reference it will stop resolving.`)) return;
    await apiFetch(`/organizations/${organizationId}/vaults/${vault.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function test() {
    setTestResult(null);
    setTestResult(
      await apiFetch<{ ok: boolean; error?: string; length?: number }>(`/organizations/${organizationId}/vaults/test`, {
        method: "POST",
        body: { reference },
      }).catch((e: Error) => ({ ok: false, error: e.message })),
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {vaults.length > 0 && (
        <Card className="divide-y divide-border">
          {vaults.map((vault) => (
            <div key={vault.id} className="flex items-center justify-between px-4 py-3">
              <span className="min-w-0">
                <span className="font-mono font-medium">{vault.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {vault.type === "aws" ? "AWS Secrets Manager" : "HashiCorp Vault"}
                </Badge>
                <span className="ml-2 text-muted-foreground">{vault.config.address ?? vault.config.region}</span>
              </span>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(vault)}>
                Delete
              </Button>
            </div>
          ))}
        </Card>
      )}

      {vaults.length > 0 && (
        <div>
          <h2 className="font-medium">Test a reference</h2>
          <div className="mt-2 flex gap-2">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="corp-vault:secret/data/payments#apiKey"
              className="font-mono"
            />
            <Button variant="outline" onClick={test} disabled={!reference}>
              Test
            </Button>
          </div>
          {testResult && (
            <p className={testResult.ok ? "mt-2 text-success" : "mt-2 text-destructive"}>
              {testResult.ok ? `Resolved (${testResult.length} characters).` : testResult.error}
            </p>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add a vault</CardTitle>
        </CardHeader>
        <CardContent>
          <form key={type} onSubmit={create} className="space-y-3">
            <Select value={type} onValueChange={(v) => setType(v as "hashicorp" | "aws")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hashicorp">HashiCorp Vault (KV v1 or v2)</SelectItem>
                <SelectItem value="aws">AWS Secrets Manager</SelectItem>
              </SelectContent>
            </Select>
            <Input name="name" placeholder="Name used in references, e.g. corp-vault" required />
            {type === "hashicorp" ? (
              <>
                <Input name="address" type="url" placeholder="https://vault.company.com:8200" required />
                <Input name="namespace" placeholder="Namespace (Vault Enterprise, optional)" />
                <Input name="token" type="password" placeholder="Token with read access" required />
              </>
            ) : (
              <>
                <Input name="region" placeholder="Region, e.g. eu-west-3" required />
                <Input name="accessKeyId" placeholder="Access key ID" required />
                <Input name="secretAccessKey" type="password" placeholder="Secret access key" required />
              </>
            )}
            <Button type="submit">Add vault</Button>
            {error && <p className="text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
