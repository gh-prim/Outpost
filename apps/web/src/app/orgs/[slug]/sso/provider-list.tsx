"use client";

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
    return <p className="mt-8 text-sm text-neutral-500">No identity provider configured yet.</p>;
  }

  return (
    <ul className="mt-8 space-y-4">
      {providers.map((provider) => (
        <ProviderItem key={provider.providerId} provider={provider} baseURL={baseURL} />
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
    <li className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <span>
          <span className="font-medium">{provider.providerId}</span>
          <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs uppercase dark:bg-neutral-800">
            {provider.type}
          </span>
        </span>
        <button type="button" onClick={remove} className="text-red-600 underline-offset-4 hover:underline">
          Delete
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-neutral-600 dark:text-neutral-400">
        <dt>Issuer</dt>
        <dd className="break-all">{provider.issuer}</dd>
        <dt>Domain</dt>
        <dd>
          {provider.domain}{" "}
          {provider.domainVerified ? (
            <span className="text-green-600">verified</span>
          ) : (
            <span className="text-amber-600">not verified</span>
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
          <p className="text-neutral-500">Sign-in is blocked until you prove you own this domain with a DNS TXT record.</p>
          {token ? (
            <div className="rounded bg-neutral-100 p-3 font-mono text-xs dark:bg-neutral-900">
              <div>Name: _outpost-verification-{provider.providerId}.{provider.domain}</div>
              <div className="break-all">
                Value: _outpost-verification-{provider.providerId}={token}
              </div>
            </div>
          ) : (
            <button type="button" onClick={requestVerification} className="underline underline-offset-4">
              Get DNS record
            </button>
          )}
          {token && (
            <button type="button" onClick={verify} className="underline underline-offset-4">
              Verify now
            </button>
          )}
        </div>
      )}
      {message && <p className="mt-2 text-red-600">{message}</p>}
    </li>
  );
}
