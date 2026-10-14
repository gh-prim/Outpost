import { apiKey } from "@better-auth/api-key";
import { sso } from "@better-auth/sso";
import { prisma } from "@outpost/db";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { auditAfterHook, auditSignIn } from "./auth-audit";

const allowedGoogleDomains = (process.env.GOOGLE_ALLOWED_DOMAINS ?? "")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string) {
  if (allowedGoogleDomains.length === 0) return true;
  const domain = email.split("@").pop()?.toLowerCase() ?? "";
  return allowedGoogleDomains.includes(domain);
}

// OIDC providers are only contacted on origins listed here (protects against SSRF).
const ssoTrustedOrigins = (process.env.SSO_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  trustedOrigins: ssoTrustedOrigins,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  databaseHooks: {
    session: {
      create: { after: auditSignIn },
    },
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
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // SSO providers always belong to an organization, so only its owners and admins manage them.
      if (ctx.path === "/sso/register" && !ctx.body?.organizationId) {
        throw new APIError("BAD_REQUEST", {
          message: "An SSO provider must be linked to an organization.",
        });
      }
    }),
    after: auditAfterHook,
  },
  plugins: [
    organization({ teams: { enabled: true } }),
    sso({
      organizationProvisioning: { defaultRole: "member" },
      domainVerification: { enabled: true, tokenPrefix: "outpost-verification" },
    }),
    // Personal API keys for the CLI and automation. Rate limiting is left to the reverse proxy.
    apiKey({ defaultPrefix: "opk_", rateLimit: { enabled: false } }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
