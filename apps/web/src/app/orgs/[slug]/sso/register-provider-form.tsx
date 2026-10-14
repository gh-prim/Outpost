"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

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
    <Card className="mt-10">
      <CardHeader>
        <CardTitle>Add an identity provider</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex gap-4">
            {(["oidc", "saml"] as const).map((option) => (
              <label key={option} className="flex items-center gap-1.5">
                <input type="radio" checked={type === option} onChange={() => setType(option)} />
                {option === "oidc" ? "OIDC" : "SAML 2.0"}
              </label>
            ))}
          </div>
          <Input name="providerId" placeholder="Provider ID (e.g. okta)" pattern="[a-z0-9-]+" required />
          <Input name="domain" placeholder="Email domain (e.g. company.com)" required />
          <Input
            name="issuer"
            type="url"
            placeholder={type === "oidc" ? "Issuer URL" : "IdP entity ID (URL)"}
            required
          />
          {type === "oidc" ? (
            <>
              <Input name="clientId" placeholder="Client ID" required />
              <Input name="clientSecret" type="password" placeholder="Client secret" required />
              <Input
                name="discoveryEndpoint"
                type="url"
                placeholder="Discovery URL (defaults to issuer/.well-known/openid-configuration)"
              />
            </>
          ) : (
            <>
              <Input name="entryPoint" type="url" placeholder="IdP SSO URL (entry point)" required />
              <Textarea name="cert" placeholder="IdP signing certificate (PEM)" required rows={4} />
              <Input name="audience" placeholder="SP entity ID (optional, defaults to the SP metadata URL)" />
            </>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add provider"}
          </Button>
          {error && <p className="text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
