import type { PairingGrant, Status, TopologyMode } from "./types";
import type { Profiles } from "./types";

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
  profiles: () => request<Profiles>("/api/profiles"),
  createClientProfile: (input: {
    name: string;
    minecraftVersion: string;
    fabricVersion: string;
    javaVersion: string;
    runner: "local" | "remote";
  }) =>
    request<Profiles["clientProfiles"][number]>("/api/profiles/client", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createAuthProfile: (input: {
    name: string;
    mode: "MICROSOFT" | "OFFLINE_SERVER";
    offlineNickname?: string | undefined;
  }) =>
    request<Profiles["authProfiles"][number]>("/api/profiles/auth", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createServerProfile: (input: {
    name: string;
    address: string;
    port: number;
    minecraftVersion: string;
    authMode: "MICROSOFT" | "OFFLINE_SERVER";
    offlineNickname?: string | undefined;
    clientProfileId: string;
  }) =>
    request<Profiles["serverProfiles"][number]>("/api/profiles/server", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createBrainProfile: (input: {
    mode: "BUILT_IN" | "EXTERNAL";
    endpoint?: string | undefined;
    model?: string | undefined;
    dailyCallLimit?: number | undefined;
  }) =>
    request<Profiles["brainProfiles"][number]>("/api/profiles/brain", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  setActiveProfiles: (input: Partial<Profiles["active"]>) =>
    request<Profiles>("/api/profiles/active", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createTask: (input: {
    title: string;
    goal: string;
    priority: number;
    author: string;
  }) =>
    request<Status["tasks"][number]>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cancelTask: (id: string) =>
    request<Status["tasks"][number]>(`/api/tasks/${id}/cancel`, {
      method: "POST",
    }),
  setControlOwner: (owner: Status["controlOwner"]) =>
    request<{ owner: Status["controlOwner"]; controlEpoch: number }>("/api/control", {
      method: "POST",
      body: JSON.stringify({ owner }),
    }),
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
