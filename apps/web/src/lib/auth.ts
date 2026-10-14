import { prisma } from "@outpost/db";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";

const allowedGoogleDomains = (process.env.GOOGLE_ALLOWED_DOMAINS ?? "")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string) {
  if (allowedGoogleDomains.length === 0) return true;
  const domain = email.split("@").pop()?.toLowerCase() ?? "";
  return allowedGoogleDomains.includes(domain);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAllowedEmail(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: "This email domain is not allowed on this Outpost instance.",
            });
          }
          return { data: user };
        },
      },
    },
  },
  plugins: [organization({ teams: { enabled: true } }), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
