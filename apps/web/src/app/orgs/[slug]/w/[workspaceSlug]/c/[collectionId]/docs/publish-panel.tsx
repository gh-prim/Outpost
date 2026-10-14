"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Publication = {
  slug: string;
  environmentId: string | null;
  title: string | null;
  logoUrl: string | null;
  accentColor: string | null;
};

const NONE = "none";
const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);

export function PublishPanel(props: {
  collectionId: string;
  defaultSlug: string;
  baseURL: string;
  environments: { id: string; name: string }[];
  publication: Publication | null;
}) {
  const router = useRouter();
  const p = props.publication;
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(p?.slug ?? toSlug(props.defaultSlug));
  const [environmentId, setEnvironmentId] = useState(p?.environmentId ?? NONE);
  const [title, setTitle] = useState(p?.title ?? "");
  const [logoUrl, setLogoUrl] = useState(p?.logoUrl ?? "");
  const [accentColor, setAccentColor] = useState(p?.accentColor ?? "");
  const [error, setError] = useState<string | null>(null);

  async function call(method: string, body?: unknown) {
    setError(null);
    try {
      await apiFetch(`/collections/${props.collectionId}/docs`, { method, body });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const url = `${props.baseURL}/docs/${p?.slug ?? slug}`;

  return (
    <div className="flex items-center gap-2">
      {p && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-muted-foreground hover:underline"
        >
          {url}
        </a>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={p ? "outline" : "default"} size="sm">
            {p ? "Publishing settings" : "Publish"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish documentation</DialogTitle>
            <DialogDescription>
              Anyone with the link can read it. Secret environment values are never shown.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void call("PUT", {
                slug,
                environmentId: environmentId === NONE ? null : environmentId,
                title: title || null,
                logoUrl,
                accentColor,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="docs-slug">Address</Label>
              <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                {props.baseURL}/docs/
                <Input id="docs-slug" value={slug} onChange={(e) => setSlug(toSlug(e.target.value))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Environment used for {"{{variables}}"}</Label>
              <Select value={environmentId} onValueChange={setEnvironmentId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None, show {"{{variables}}"}</SelectItem>
                  {props.environments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (defaults to the collection name)"
            />
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Logo URL (https://...)"
              type="url"
            />
            <div className="flex items-center gap-2">
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="Accent color, e.g. #4f46e5"
                pattern="#[0-9a-fA-F]{6}"
              />
              {/^#[0-9a-fA-F]{6}$/.test(accentColor) && (
                <span className="size-7 shrink-0 rounded-md border" style={{ background: accentColor }} />
              )}
            </div>
            <div className="flex justify-between gap-2 pt-2">
              {p ? (
                <Button type="button" variant="ghost" className="text-destructive" onClick={() => call("DELETE")}>
                  Unpublish
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit">{p ? "Save" : "Publish"}</Button>
            </div>
            {error && <p className="text-destructive">{error}</p>}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
