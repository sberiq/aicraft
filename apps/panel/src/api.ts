import type { PairingGrant, Status, TopologyMode } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error?.message ?? `Request failed: ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  status: () => request<Status>("/api/status"),
  startOnboarding: (displayName: string) =>
    request<Status["onboarding"]>("/api/onboarding/start", {
      method: "POST",
      body: JSON.stringify({ displayName }),
    }),
  completeOnboarding: () =>
    request<Status["onboarding"]>("/api/onboarding/complete", {
      method: "POST",
    }),
  setTopology: (topology: TopologyMode) =>
    request<Status["settings"]>("/api/topology", {
      method: "POST",
      body: JSON.stringify({ topology }),
    }),
  createPairing: (kind: PairingGrant["kind"]) =>
    request<PairingGrant>("/api/connectors/pair", {
      method: "POST",
      body: JSON.stringify({ kind }),
    }),
  revokeConnector: (id: string) =>
    request<{ status: string; connectorId: string }>(`/api/connectors/${id}/token`, {
      method: "DELETE",
    }),
};
