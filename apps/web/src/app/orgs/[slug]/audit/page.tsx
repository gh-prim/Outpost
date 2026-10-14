import { Button, Card } from "@outpost/ui";
import { Suspense } from "react";
import { listAuditLogs } from "@/server/audit";
import { getPageOrganization } from "@/server/page";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium" });

async function AuditContent({ params }: { params: PageProps<"/orgs/[slug]/audit">["params"] }) {
  const { slug } = await params;
  const { organization, role } = await getPageOrganization(slug);
  if (role !== "admin") {
    return (
      <p className="mx-auto w-full max-w-5xl px-6 py-8 text-muted-foreground">
        Only organization owners and admins can read the audit log.
      </p>
    );
  }

  const { entries } = await listAuditLogs(organization.id, { limit: 200 });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Audit log</h1>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/v1/organizations/${organization.id}/audit-logs?format=csv`}>Export CSV</a>
        </Button>
      </div>
      <p className="mt-1 text-muted-foreground">Latest 200 events. The CSV export contains the full history.</p>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Details</th>
              <th className="px-3 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {dateFormat.format(entry.createdAt)}
                </td>
                <td className="px-3 py-2">{entry.actor?.email ?? "system"}</td>
                <td className="px-3 py-2 font-mono text-xs">{entry.action}</td>
                <td className="max-w-80 truncate px-3 py-2 font-mono text-xs text-muted-foreground">
                  {entry.metadata ? JSON.stringify(entry.metadata) : ""}
                </td>
                <td className="max-w-40 truncate px-3 py-2 text-muted-foreground">{entry.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <p className="p-4 text-muted-foreground">No events yet.</p>}
      </Card>
    </div>
  );
}

export default function AuditPage({ params }: PageProps<"/orgs/[slug]/audit">) {
  return (
    <Suspense>
      <AuditContent params={params} />
    </Suspense>
  );
}
