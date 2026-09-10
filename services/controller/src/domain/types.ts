export type ConnectorKind = "client_mod" | "server_plugin";
export type ConnectorStatus = "offline" | "online" | "revoked";
export type TopologyMode = "LOCAL" | "REMOTE_CLIENT";
export type OnboardingStatus = "not_started" | "in_progress" | "completed";
export type BrainMode = "BUILT_IN" | "EXTERNAL";
export type AuthMode = "MICROSOFT" | "OFFLINE_SERVER";
export type ControlOwner = "NONE" | "AGENT" | "HUMAN";
export type TaskStatus = "QUEUED" | "RUNNING" | "BLOCKED" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type RenderMode = "ECONOMY" | "OBSERVE" | "INTERACTIVE";
export type ActionType =
  | "send_chat"
  | "send_command"
  | "set_movement"
  | "set_render_mode"
  | "capture_screenshot"
  | "server_login";
export type ActionStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";

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
  offlineNickname?: string | undefined;
  loginCommandTemplate?: string | undefined;
  clientProfileId: string;
}

export interface AuthProfile {
  id: string;
  name: string;
  mode: AuthMode;
  offlineNickname?: string | undefined;
}

export interface BrainProfile {
  id: string;
  mode: BrainMode;
  endpoint?: string | undefined;
  model?: string | undefined;
  dailyCallLimit?: number | undefined;
}

export interface ControllerSettings {
  activeTopology: TopologyMode;
  heartbeatIntervalMs: number;
  connectorEndpoint: string;
}

export interface ActiveProfiles {
  clientProfileId: string | null;
  serverProfileId: string | null;
  authProfileId: string | null;
  brainProfileId: string | null;
}

export interface ProfileCatalog {
  active: ActiveProfiles;
  clientProfiles: ClientProfile[];
  serverProfiles: ServerProfile[];
  authProfiles: AuthProfile[];
  brainProfiles: BrainProfile[];
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

export interface AgentTask {
  id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  priority: number;
  author: string;
  createdAt: string;
  updatedAt: string;
  result?: string | undefined;
}

export interface ActionRecord {
  id: string;
  taskId?: string | undefined;
  connectorId: string;
  actionType: ActionType;
  parameters: {
    text?: string | undefined;
    mode?: RenderMode | undefined;
    movement?: {
      forward: boolean;
      back: boolean;
      left: boolean;
      right: boolean;
      jump: boolean;
      sneak: boolean;
      sprint: boolean;
    } | undefined;
    secretId?: string | undefined;
  };
  status: ActionStatus;
  controlEpoch: number;
  requestedAt: string;
  completedAt: string | null;
  result?: string | undefined;
}

export interface CapturedScreenshot {
  actionId: string;
  dataUrl: string;
  capturedAt: string;
}
