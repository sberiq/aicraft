export type ConnectorKind = "client_mod" | "server_plugin";
export type ConnectorStatus = "offline" | "online" | "revoked";
export type TopologyMode = "LOCAL" | "REMOTE_CLIENT";
export type OnboardingStatus = "not_started" | "in_progress" | "completed";
export type BrainMode = "BUILT_IN" | "EXTERNAL";
export type AuthMode = "MICROSOFT" | "OFFLINE_SERVER";

export interface OwnerProfile {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface PairingGrant {
  id: string;
  code: string;
  kind: ConnectorKind;
  expiresAt: Date;
  used: boolean;
}

export interface ConnectorRecord {
  id: string;
  kind: ConnectorKind;
  name: string;
  tokenHash: string;
  status: ConnectorStatus;
  protocolVersion: number;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface ClientProfile {
  id: string;
  name: string;
  minecraftVersion: string;
  fabricVersion: string;
  javaVersion: string;
  runner: "local" | "remote";
}

export interface ServerProfile {
  id: string;
  name: string;
  address: string;
  port: number;
  minecraftVersion: string;
  authMode: AuthMode;
  offlineNickname?: string;
  clientProfileId: string;
}

export interface BrainProfile {
  id: string;
  mode: BrainMode;
  endpoint?: string;
  model?: string;
  dailyCallLimit?: number;
}

export interface ControllerSettings {
  activeTopology: TopologyMode;
  heartbeatIntervalMs: number;
  connectorEndpoint: string;
}

export interface OnboardingState {
  status: OnboardingStatus;
  owner: OwnerProfile | null;
  completedSteps: string[];
}

export interface Snapshot {
  position: {
    x: number;
    y: number;
    z: number;
  };
  health: number;
  hunger: number;
  dimension?: string | undefined;
  capturedAt: string;
}
