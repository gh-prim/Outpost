"use client";

import { Badge, Button, Card } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Provider = {
  providerId: string;
  type: string;
  issuer: string;
  domain: string;
  domainVerified: boolean;
};

export function ProviderList({ providers, baseURL }: { providers: Provider[]; baseURL: string }) {
  if (providers.length === 0) {
    return <p className="mt-8 text-muted-foreground">No identity provider configured yet.</p>;
  }

  return (
    <ul className="mt-8 space-y-4">
      {providers.map((provider) => (
        <li key={provider.providerId}>
          <ProviderItem provider={provider} baseURL={baseURL} />
        </li>
      ))}
    </ul>
  );
}

function ProviderItem({ provider, baseURL }: { provider: Provider; baseURL: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function requestVerification() {
    setMessage(null);
    const { data, error } = await authClient.sso.requestDomainVerification({ providerId: provider.providerId });
    if (error) setMessage(error.message ?? "Could not create a verification token");
    else setToken(data.domainVerificationToken);
  }

  async function verify() {
    setMessage(null);
    const { error } = await authClient.sso.verifyDomain({ providerId: provider.providerId });
    if (error) setMessage(error.message ?? "DNS record not found yet");
    else router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete the provider "${provider.providerId}"?`)) return;
    const { error } = await authClient.sso.deleteProvider({ providerId: provider.providerId });
    if (error) setMessage(error.message ?? "Could not delete the provider");
    else router.refresh();
  }

  const endpoints =
    provider.type === "oidc"
      ? [["Redirect URI", `${baseURL}/api/auth/sso/callback/${provider.providerId}`]]
      : [
          ["ACS URL", `${baseURL}/api/auth/sso/saml2/sp/acs/${provider.providerId}`],
          ["SP metadata", `${baseURL}/api/auth/sso/saml2/sp/metadata?providerId=${provider.providerId}`],
        ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span>
          <span className="font-medium">{provider.providerId}</span>
          <Badge variant="secondary" className="ml-2 uppercase">
            {provider.type}
          </Badge>
        </span>
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={remove}>
          Delete
        </Button>
      </div>
      <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-muted-foreground">
        <dt>Issuer</dt>
        <dd className="break-all">{provider.issuer}</dd>
        <dt>Domain</dt>
        <dd>
          {provider.domain}{" "}
          {provider.domainVerified ? (
            <Badge variant="success">verified</Badge>
          ) : (
            <Badge variant="warning">not verified</Badge>
          )}
        </dd>
        {endpoints.map(([label, value]) => (
          <div key={label} className="contents">
            <dt>{label}</dt>
            <dd className="break-all font-mono text-xs">{value}</dd>
          </div>
        ))}
      </dl>

      {!provider.domainVerified && (
        <div className="mt-4 space-y-2">
          <p className="text-muted-foreground">
            Sign-in is blocked until you prove you own this domain with a DNS TXT record.
          </p>
          {token ? (
            <div className="rounded-md bg-muted p-3 font-mono text-xs">
              <div>
                Name: _outpost-verification-{provider.providerId}.{provider.domain}
              </div>
              <div className="break-all">
                Value: _outpost-verification-{provider.providerId}={token}
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={requestVerification}>
              Get DNS record
            </Button>
          )}
          {token && (
            <Button type="button" size="sm" onClick={verify}>
              Verify now
            </Button>
          )}
        </div>
      )}
      {message && <p className="mt-2 text-destructive">{message}</p>}
    </Card>
  );
}
