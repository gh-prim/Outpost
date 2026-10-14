import aws4 from "aws4";

export type HashicorpConfig = { address: string; namespace?: string };
export type HashicorpCredentials = { token: string };
export type AwsConfig = { region: string };
export type AwsCredentials = { accessKeyId: string; secretAccessKey: string; sessionToken?: string };

export type Integration =
  | { type: "hashicorp"; config: HashicorpConfig; credentials: HashicorpCredentials }
  | { type: "aws"; config: AwsConfig; credentials: AwsCredentials };

/** Reads one secret. `key` picks a field of a JSON or KV secret; without it the whole secret is returned. */
export async function readSecret(integration: Integration, secretPath: string, key?: string): Promise<string> {
  return integration.type === "hashicorp"
    ? readHashicorp(integration.config, integration.credentials, secretPath, key)
    : readAws(integration.config, integration.credentials, secretPath, key);
}

function pick(data: unknown, key: string | undefined, where: string) {
  if (key === undefined) return typeof data === "string" ? data : JSON.stringify(data);
  const value = (data as Record<string, unknown> | null)?.[key];
  if (value === undefined) throw new Error(`Key "${key}" not found in ${where}`);
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** KV v2 (`secret/data/app`) and KV v1 paths both work. */
async function readHashicorp(config: HashicorpConfig, credentials: HashicorpCredentials, secretPath: string, key?: string) {
  const response = await fetch(new URL(`/v1/${secretPath.replace(/^\/+/, "")}`, config.address), {
    headers: {
      "X-Vault-Token": credentials.token,
      ...(config.namespace ? { "X-Vault-Namespace": config.namespace } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Vault answered ${response.status} for ${secretPath}`);
  const body = (await response.json()) as { data?: { data?: unknown } & Record<string, unknown> };
  const data = body.data && "data" in body.data && "metadata" in body.data ? body.data.data : body.data;
  return pick(data, key, secretPath);
}

async function readAws(config: AwsConfig, credentials: AwsCredentials, secretId: string, key?: string) {
  const host = `secretsmanager.${config.region}.amazonaws.com`;
  const body = JSON.stringify({ SecretId: secretId });
  const signed = aws4.sign(
    {
      host,
      method: "POST",
      path: "/",
      service: "secretsmanager",
      region: config.region,
      headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": "secretsmanager.GetSecretValue" },
      body,
    },
    credentials,
  );
  const response = await fetch(`https://${host}/`, {
    method: "POST",
    headers: signed.headers as Record<string, string>,
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`AWS Secrets Manager answered ${response.status} for ${secretId}`);
  const { SecretString } = (await response.json()) as { SecretString?: string };
  if (SecretString === undefined) throw new Error(`${secretId} has no text value`);
  if (key === undefined) return SecretString;
  return pick(JSON.parse(SecretString), key, secretId);
}
