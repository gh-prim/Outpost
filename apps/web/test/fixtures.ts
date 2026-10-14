import { randomUUID } from "node:crypto";
import { prisma } from "@outpost/db";
import type { Actor } from "@/server/context";

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "user", organization, verification, "auditLog", workspace, "vaultIntegration" CASCADE',
  );
}

export async function createUser(name: string): Promise<Actor> {
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      name,
      email: `${name.toLowerCase()}@acme.test`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return { userId: id, name, ipAddress: "127.0.0.1", userAgent: "vitest" };
}

export async function createOrganization(members: { actor: Actor; role: "owner" | "admin" | "member" }[]) {
  const id = randomUUID();
  await prisma.organization.create({
    data: { id, name: "Acme", slug: `acme-${id.slice(0, 8)}`, createdAt: new Date() },
  });
  for (const { actor, role } of members) {
    await prisma.member.create({
      data: { id: randomUUID(), organizationId: id, userId: actor.userId, role, createdAt: new Date() },
    });
  }
  return id;
}

export async function createTeam(organizationId: string, members: Actor[]) {
  const id = randomUUID();
  await prisma.team.create({ data: { id, name: "Backend", organizationId, createdAt: new Date() } });
  for (const actor of members) {
    await prisma.teamMember.create({
      data: { id: randomUUID(), teamId: id, userId: actor.userId, createdAt: new Date() },
    });
  }
  return id;
}
