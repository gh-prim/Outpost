"use client";

import { cn } from "@outpost/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export function OrgNav({
  organizationId,
  slug,
  name,
  isAdmin,
}: {
  organizationId: string;
  slug: string;
  name: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  // Team management and audit attribution use the session's active organization.
  useEffect(() => {
    void authClient.organization.setActive({ organizationId });
  }, [organizationId]);

  const links = [
    {
      href: `/orgs/${slug}`,
      label: "Workspaces",
      match: (p: string) => p === `/orgs/${slug}` || p.startsWith(`/orgs/${slug}/w/`),
    },
    ...(isAdmin
      ? [
          {
            href: `/orgs/${slug}/members`,
            label: "Members",
            match: (p: string) => p.startsWith(`/orgs/${slug}/members`),
          },
          {
            href: `/orgs/${slug}/sso`,
            label: "Single sign-on",
            match: (p: string) => p.startsWith(`/orgs/${slug}/sso`),
          },
          {
            href: `/orgs/${slug}/audit`,
            label: "Audit log",
            match: (p: string) => p.startsWith(`/orgs/${slug}/audit`),
          },
        ]
      : []),
  ];

  return (
    <header className="border-b">
      <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-6 px-6">
        <Link href="/" className="font-semibold">
          Outpost
        </Link>
        <span className="text-muted-foreground">{name}</span>
        <nav className="flex gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                link.match(pathname) && "font-medium text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
