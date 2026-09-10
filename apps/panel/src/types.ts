export type ConnectorKind = "client_mod" | "server_plugin";
export type ConnectorStatus = "offline" | "online" | "revoked";
export type TopologyMode = "LOCAL" | "REMOTE_CLIENT";
export type OnboardingStatus = "not_started" | "in_progress" | "completed";
export type ControlOwner = "NONE" | "AGENT" | "HUMAN";
export type TaskStatus = "QUEUED" | "RUNNING" | "BLOCKED" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface Connector {
  id: string;
  kind: ConnectorKind;
  name: string;
  status: ConnectorStatus;
  protocolVersion: number;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface Onboarding {
  status: OnboardingStatus;
  owner: {
    id: string;
    displayName: string;
    createdAt: string;
  } | null;
  completedSteps: string[];
}

export interface Settings {
  activeTopology: TopologyMode;
  heartbeatIntervalMs: number;
  connectorEndpoint: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  minecraftVersion: string;
  fabricVersion: string;
  javaVersion: string;
  runner: "local" | "remote";
}

export interface AuthProfile {
  id: string;
  name: string;
  mode: "MICROSOFT" | "OFFLINE_SERVER";
  offlineNickname?: string;
}

export interface ServerProfile {
  id: string;
  name: string;
  address: string;
  port: number;
  minecraftVersion: string;
  authMode: "MICROSOFT" | "OFFLINE_SERVER";
  offlineNickname?: string;
  clientProfileId: string;
}

export interface BrainProfile {
  id: string;
  mode: "BUILT_IN" | "EXTERNAL";
  endpoint?: string;
  model?: string;
  dailyCallLimit?: number;
}

export interface ActiveProfiles {
  clientProfileId: string | null;
  serverProfileId: string | null;
  authProfileId: string | null;
  brainProfileId: string | null;
}

export interface Profiles {
  active: ActiveProfiles;
  clientProfiles: ClientProfile[];
  serverProfiles: ServerProfile[];
  authProfiles: AuthProfile[];
  brainProfiles: BrainProfile[];
}

export interface AgentTask {
  id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  priority: number;
  author: string;
  createdAt: string;
  updatedAt: string;
  result?: string;
}

export interface Status {
  onboarding: Onboarding;
  settings: Settings;
  profiles: Profiles;
  controlOwner: ControlOwner;
  tasks: AgentTask[];
  controlEpoch: number;
  activeConnectorId: string | null;
  connectors: Connector[];
  snapshot: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    health: number;
    hunger: number;
    dimension?: string;
    capturedAt: string;
  } | null;
}

export interface PairingGrant {
  id: string;
  code: string;
  kind: ConnectorKind;
  expiresAt: string;
  connectorEndpoint: string;
  expiresInSeconds: number;
}
