"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";

export function RegisterProviderForm({ organizationId, baseURL }: { organizationId: string; baseURL: string }) {
  const router = useRouter();
  const [type, setType] = useState<"oidc" | "saml">("oidc");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const providerId = value("providerId");
    const spEntityId = value("audience") || `${baseURL}/api/auth/sso/saml2/sp/metadata?providerId=${providerId}`;

    setPending(true);
    setError(null);
    const { error } = await authClient.sso.register({
      providerId,
      issuer: value("issuer"),
      domain: value("domain"),
      organizationId,
      ...(type === "oidc"
        ? {
            oidcConfig: {
              clientId: value("clientId"),
              clientSecret: value("clientSecret"),
              discoveryEndpoint: value("discoveryEndpoint") || undefined,
              scopes: ["openid", "email", "profile"],
            },
          }
        : {
            samlConfig: {
              entryPoint: value("entryPoint"),
              cert: value("cert"),
              callbackUrl: `${baseURL}/api/auth/sso/saml2/sp/acs/${providerId}`,
              audience: spEntityId,
              idpMetadata: { entityID: value("issuer") },
              spMetadata: { entityID: spEntityId },
            },
          }),
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "Could not register the provider");
      return;
    }
    formElement.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Add an identity provider</h2>
      <div className="flex gap-4 text-sm">
        {(["oidc", "saml"] as const).map((option) => (
          <label key={option} className="flex items-center gap-1.5">
            <input type="radio" checked={type === option} onChange={() => setType(option)} />
            {option === "oidc" ? "OIDC" : "SAML 2.0"}
          </label>
        ))}
      </div>
      <input name="providerId" placeholder="Provider ID (e.g. okta)" pattern="[a-z0-9-]+" required className={inputClass} />
      <input name="domain" placeholder="Email domain (e.g. company.com)" required className={inputClass} />
      <input name="issuer" type="url" placeholder={type === "oidc" ? "Issuer URL" : "IdP entity ID (URL)"} required className={inputClass} />
      {type === "oidc" ? (
        <>
          <input name="clientId" placeholder="Client ID" required className={inputClass} />
          <input name="clientSecret" type="password" placeholder="Client secret" required className={inputClass} />
          <input
            name="discoveryEndpoint"
            type="url"
            placeholder="Discovery URL (defaults to issuer/.well-known/openid-configuration)"
            className={inputClass}
          />
        </>
      ) : (
        <>
          <input name="entryPoint" type="url" placeholder="IdP SSO URL (entry point)" required className={inputClass} />
          <textarea name="cert" placeholder="IdP signing certificate (PEM)" required rows={4} className={inputClass} />
          <input name="audience" placeholder="SP entity ID (optional, defaults to the SP metadata URL)" className={inputClass} />
        </>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Saving…" : "Add provider"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
