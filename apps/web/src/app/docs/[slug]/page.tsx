import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocsView } from "@/components/docs-view";
import type { CollectionDocument } from "@/lib/collection-items";
import { docsVariables, getPublishedDocs } from "@/server/docs";

type Props = PageProps<"/docs/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const publication = await getPublishedDocs((await params).slug);
  // Raised here, before streaming starts, so unknown docs answer with a real 404 status.
  if (!publication) notFound();
  const document = publication.collection.content as CollectionDocument;
  return { title: publication.title || document.info.name };
}

async function PublishedDocs({ params }: { params: Props["params"] }) {
  const publication = await getPublishedDocs((await params).slug);
  if (!publication) notFound();
  return (
    <DocsView
      document={publication.collection.content as CollectionDocument}
      variables={await docsVariables(publication.environmentId)}
      branding={publication}
    />
  );
}

/** Public documentation: anyone with the link can read it, no sign-in. */
export default function PublishedDocsPage({ params }: Props) {
  return (
    <Suspense>
      <PublishedDocs params={params} />
    </Suspense>
  );
}
