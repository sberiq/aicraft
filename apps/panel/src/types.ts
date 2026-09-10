export type ConnectorKind = "client_mod" | "server_plugin";
export type ConnectorStatus = "offline" | "online" | "revoked";
export type TopologyMode = "LOCAL" | "REMOTE_CLIENT";
export type OnboardingStatus = "not_started" | "in_progress" | "completed";

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

export interface Status {
  onboarding: Onboarding;
  settings: Settings;
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
