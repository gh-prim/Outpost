import { MethodBadge, StatusBadge } from "@outpost/ui";
import { type CollectionDocument, type Item, requestOf, urlOf } from "@/lib/collection-items";
import { resolveVariables, toCurl } from "@/lib/curl";
import { renderMarkdown } from "@/lib/markdown";

type Example = { name?: string; code?: number; body?: string };

export type DocsBranding = { title?: string | null; logoUrl?: string | null; accentColor?: string | null };

function Markdown({ source }: { source: unknown }) {
  const html = renderMarkdown(source);
  if (!html) return null;
  return <div className="docs-markdown space-y-2 text-muted-foreground" dangerouslySetInnerHTML={{ __html: html }} />;
}

function anchor(item: Item) {
  return `item-${item.id}`;
}

function Nav({ items, depth = 0 }: { items: Item[]; depth?: number }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.id}>
          {item.item ? (
            <>
              <a href={`#${anchor(item)}`} className="block py-0.5 font-medium" style={{ paddingLeft: depth * 12 }}>
                {item.name}
              </a>
              <Nav items={item.item} depth={depth + 1} />
            </>
          ) : (
            <a
              href={`#${anchor(item)}`}
              className="flex items-center gap-2 py-0.5 text-muted-foreground hover:text-foreground"
              style={{ paddingLeft: depth * 12 }}
            >
              <MethodBadge method={requestOf(item).method ?? "GET"} short className="w-10 shrink-0" />
              <span className="truncate">{item.name}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function pretty(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function RequestDoc({ item, variables }: { item: Item; variables: Map<string, string> }) {
  const request = requestOf(item);
  const headers = (request.header ?? []).filter((h) => !h.disabled);
  const examples = (item.response as Example[] | undefined) ?? [];
  return (
    <section id={anchor(item)} className="scroll-mt-6 border-t py-8">
      <h3 className="text-base font-semibold">{item.name}</h3>
      <div className="mt-2 flex items-center gap-2 font-mono text-xs">
        <MethodBadge method={request.method ?? "GET"} />
        <span className="break-all">{resolveVariables(urlOf(request), variables)}</span>
      </div>
      <div className="mt-3">
        <Markdown source={request.description} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {headers.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Headers</h4>
              <table className="w-full font-mono text-xs">
                <tbody>
                  {headers.map((h, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-1 pr-4">{h.key}</td>
                      <td className="py-1 break-all text-muted-foreground">{resolveVariables(h.value, variables)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {request.body?.raw && (
            <div>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Body</h4>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                {pretty(request.body.raw)}
              </pre>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Example request</h4>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
              {toCurl(request, variables)}
            </pre>
          </div>
          {examples.map((example, i) => (
            <div key={i}>
              <h4 className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Example response {example.code && <StatusBadge code={example.code} />}
                <span className="normal-case">{example.name}</span>
              </h4>
              {example.body && (
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                  {pretty(example.body)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sections({ items, variables }: { items: Item[]; variables: Map<string, string> }) {
  return items.map((item) =>
    item.item ? (
      <div key={item.id} id={anchor(item)} className="scroll-mt-6 pt-8">
        <h2 className="text-lg font-semibold">{item.name}</h2>
        <div className="mt-2">
          <Markdown source={item.description} />
        </div>
        <Sections items={item.item} variables={variables} />
      </div>
    ) : (
      <RequestDoc key={item.id} item={item} variables={variables} />
    ),
  );
}

/** Read-only documentation of a collection, shared by the in-app view and published docs. */
export function DocsView({
  document,
  variables,
  branding = {},
}: {
  document: CollectionDocument;
  variables: Map<string, string>;
  branding?: DocsBranding;
}) {
  const accent =
    branding.accentColor && /^#[0-9a-f]{3,8}$/i.test(branding.accentColor) ? branding.accentColor : undefined;
  return (
    <div
      className="grid w-full lg:grid-cols-[16rem_1fr]"
      style={accent ? ({ "--primary": accent } as React.CSSProperties) : undefined}
    >
      <aside className="hidden border-r p-6 lg:block">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
          {branding.logoUrl && /^https:\/\//.test(branding.logoUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="mb-4 h-8 w-auto" />
          )}
          <Nav items={document.item} />
        </div>
      </aside>
      <main className="min-w-0 px-6 py-8 lg:px-10">
        <h1 className="text-2xl font-semibold" style={accent ? { color: accent } : undefined}>
          {branding.title || document.info.name}
        </h1>
        <div className="mt-3">
          <Markdown source={document.info.description} />
        </div>
        <Sections items={document.item} variables={variables} />
      </main>
    </div>
  );
}
