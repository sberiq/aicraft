import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  type BrainProfile,
  type ClientProfile,
  type AuthProfile,
  type AgentTask,
  type ControlOwner,
  type ConnectorKind,
  type ConnectorRecord,
  type ControllerSettings,
  type OnboardingState,
  type OwnerProfile,
  type PairingGrant,
  type ProfileCatalog,
  type ServerProfile,
  type Snapshot,
  type TopologyMode,
} from "./types.js";
import {
  serializedControllerStateSchema,
  type SerializedControllerState,
} from "../persistence/schema.js";

interface PairConnectorInput {
  pairingCode: string;
  kind: ConnectorKind;
  name: string;
  protocolVersion: number;
}

export class ControllerState {
  private readonly pairingGrants = new Map<string, PairingGrant>();
  private readonly connectors = new Map<string, ConnectorRecord>();
  private readonly clientProfiles = new Map<string, ClientProfile>();
  private readonly serverProfiles = new Map<string, ServerProfile>();
  private readonly authProfiles = new Map<string, AuthProfile>();
  private readonly brainProfiles = new Map<string, BrainProfile>();
  private activeConnectorId: string | null = null;
  private controlEpoch = 1;
  private latestSnapshot: Snapshot | null = null;
  private changeListener: (() => void) | null = null;
  private readonly tasks = new Map<string, AgentTask>();
  private controlOwner: ControlOwner = "NONE";
  private activeClientProfileId: string | null = null;
  private activeServerProfileId: string | null = null;
  private activeAuthProfileId: string | null = null;
  private activeBrainProfileId: string | null = null;

  private readonly onboardingState: OnboardingState = {
    status: "not_started",
    owner: null,
    completedSteps: [],
  };

  private readonly settings: ControllerSettings = {
    activeTopology: "LOCAL",
    heartbeatIntervalMs: 5_000,
    connectorEndpoint: "/connector",
  };

  constructor() {
    const client = this.createClientProfile({
      name: "Minecraft 1.20.2",
      minecraftVersion: "1.20.2",
      fabricVersion: "0.91.6+1.20.2",
      javaVersion: "17",
      runner: "local",
    });
    const auth = this.createAuthProfile({
      name: "Offline player",
      mode: "OFFLINE_SERVER",
      offlineNickname: "AiCraft",
    });
    const server = this.createServerProfile({
      name: "Local test server",
      address: "127.0.0.1",
      port: 25565,
      minecraftVersion: "1.20.2",
      authMode: "OFFLINE_SERVER",
      offlineNickname: "AiCraft",
      clientProfileId: client.id,
    });
    const brain = this.createBrainProfile({
      mode: "BUILT_IN",
      model: "gpt-5-mini",
      dailyCallLimit: 500,
    });

    this.activeClientProfileId = client.id;
    this.activeAuthProfileId = auth.id;
    this.activeServerProfileId = server.id;
    this.activeBrainProfileId = brain.id;
  }

  setChangeListener(listener: (() => void) | null): void {
    this.changeListener = listener;
  }

  private notifyChange(): void {
    this.changeListener?.();
  }

  startOnboarding(displayName: string): OnboardingState {
    if (this.onboardingState.status === "completed") {
      return this.getOnboardingState();
    }

    const owner: OwnerProfile = {
      id: randomUUID(),
      displayName,
      createdAt: new Date().toISOString(),
    };

    this.onboardingState.owner = owner;
    this.onboardingState.status = "in_progress";
    this.onboardingState.completedSteps = ["owner"];
    this.notifyChange();
    return this.getOnboardingState();
  }

  completeOnboarding(): OnboardingState {
    if (this.onboardingState.status === "not_started") {
      throw new Error("Onboarding has not been started");
    }

    this.onboardingState.status = "completed";
    this.notifyChange();
    return this.getOnboardingState();
  }

  getOnboardingState(): OnboardingState {
    return structuredClone(this.onboardingState);
  }

  createClientProfile(input: Omit<ClientProfile, "id">): ClientProfile {
    const profile: ClientProfile = {
      id: randomUUID(),
      ...structuredClone(input),
    };
    this.clientProfiles.set(profile.id, profile);
    if (this.clientProfiles.size === 1) {
      this.activeClientProfileId = profile.id;
    }
    this.notifyChange();
    return structuredClone(profile);
  }

  createServerProfile(input: Omit<ServerProfile, "id">): ServerProfile {
    if (!this.clientProfiles.has(input.clientProfileId)) {
      throw new Error("Client profile not found");
    }

    const profile: ServerProfile = {
      id: randomUUID(),
      ...structuredClone(input),
    };
    this.serverProfiles.set(profile.id, profile);
    if (this.serverProfiles.size === 1) {
      this.activeServerProfileId = profile.id;
    }
    this.notifyChange();
    return structuredClone(profile);
  }

  createAuthProfile(input: Omit<AuthProfile, "id">): AuthProfile {
    if (input.mode === "OFFLINE_SERVER" && !input.offlineNickname) {
      throw new Error("Offline nickname is required");
    }

    const profile: AuthProfile = {
      id: randomUUID(),
      ...structuredClone(input),
    };
    this.authProfiles.set(profile.id, profile);
    if (this.authProfiles.size === 1) {
      this.activeAuthProfileId = profile.id;
    }
    this.notifyChange();
    return structuredClone(profile);
  }

  createBrainProfile(input: Omit<BrainProfile, "id">): BrainProfile {
    if (input.mode === "EXTERNAL" && !input.endpoint) {
      throw new Error("External brain endpoint is required");
    }

    const profile: BrainProfile = {
      id: randomUUID(),
      ...structuredClone(input),
    };
    this.brainProfiles.set(profile.id, profile);
    if (this.brainProfiles.size === 1) {
      this.activeBrainProfileId = profile.id;
    }
    this.notifyChange();
    return structuredClone(profile);
  }

  listProfiles(): ProfileCatalog {
    return {
      active: {
        clientProfileId: this.activeClientProfileId,
        serverProfileId: this.activeServerProfileId,
        authProfileId: this.activeAuthProfileId,
        brainProfileId: this.activeBrainProfileId,
      },
      clientProfiles: [...this.clientProfiles.values()].map((profile) => structuredClone(profile)),
      serverProfiles: [...this.serverProfiles.values()].map((profile) => structuredClone(profile)),
      authProfiles: [...this.authProfiles.values()].map((profile) => structuredClone(profile)),
      brainProfiles: [...this.brainProfiles.values()].map((profile) => structuredClone(profile)),
    };
  }

  setActiveProfiles(input: {
    clientProfileId?: string | undefined;
    serverProfileId?: string | undefined;
    authProfileId?: string | undefined;
    brainProfileId?: string | undefined;
  }): ProfileCatalog {
    if (input.clientProfileId !== undefined) {
      if (!this.clientProfiles.has(input.clientProfileId)) {
        throw new Error("Client profile not found");
      }
      this.activeClientProfileId = input.clientProfileId;
    }

    if (input.serverProfileId !== undefined) {
      if (!this.serverProfiles.has(input.serverProfileId)) {
        throw new Error("Server profile not found");
      }
      this.activeServerProfileId = input.serverProfileId;
    }

    if (input.authProfileId !== undefined) {
      if (!this.authProfiles.has(input.authProfileId)) {
        throw new Error("Auth profile not found");
      }
      this.activeAuthProfileId = input.authProfileId;
    }

    if (input.brainProfileId !== undefined) {
      if (!this.brainProfiles.has(input.brainProfileId)) {
        throw new Error("Brain profile not found");
      }
      this.activeBrainProfileId = input.brainProfileId;
    }

    this.controlEpoch += 1;
    this.notifyChange();
    return this.listProfiles();
  }

  createPairingGrant(kind: ConnectorKind): {
    id: string;
    code: string;
    kind: ConnectorKind;
    expiresAt: string;
  } {
    const now = Date.now();
    for (const grant of this.pairingGrants.values()) {
      if (!grant.used && grant.expiresAt.getTime() > now && grant.kind === kind) {
        return {
          id: grant.id,
          code: grant.code,
          kind: grant.kind,
          expiresAt: grant.expiresAt.toISOString(),
        };
      }
    }

    const grant: PairingGrant = {
      id: randomUUID(),
      code: randomBytes(6).toString("base64url"),
      kind,
      expiresAt: new Date(now + 15 * 60_000),
      used: false,
    };
    this.pairingGrants.set(grant.code, grant);

    return {
      id: grant.id,
      code: grant.code,
      kind: grant.kind,
      expiresAt: grant.expiresAt.toISOString(),
    };
  }

  pairConnector(input: PairConnectorInput): {
    connector: Omit<ConnectorRecord, "tokenHash">;
    connectorToken: string;
  } {
    const grant = this.pairingGrants.get(input.pairingCode);
    const now = Date.now();

    if (!grant || grant.used || grant.expiresAt.getTime() <= now || grant.kind !== input.kind) {
      throw new Error("Invalid or expired pairing code");
    }

    if (input.protocolVersion !== 1) {
      throw new Error("Unsupported connector protocol version");
    }

    const connectorToken = randomBytes(32).toString("base64url");
    const connector: ConnectorRecord = {
      id: randomUUID(),
      kind: input.kind,
      name: input.name,
      tokenHash: hashToken(connectorToken),
      status: "online",
      protocolVersion: input.protocolVersion,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };

    grant.used = true;
    this.connectors.set(connector.id, connector);
    if (connector.kind === "client_mod") {
      this.activeConnectorId = connector.id;
      this.controlEpoch += 1;
    }
    this.notifyChange();

    const { tokenHash: _tokenHash, ...publicConnector } = connector;
    return { connector: publicConnector, connectorToken };
  }

  authenticateConnector(token: string): ConnectorRecord | null {
    const tokenHash = hashToken(token);
    for (const connector of this.connectors.values()) {
      if (connector.tokenHash === tokenHash && connector.status !== "revoked") {
        connector.status = "online";
        connector.lastSeenAt = new Date().toISOString();
        if (connector.kind === "client_mod") {
          this.activeConnectorId = connector.id;
          this.controlEpoch += 1;
        }
        return connector;
      }
    }
    return null;
  }

  markHeartbeat(connectorId: string): void {
    const connector = this.connectors.get(connectorId);
    if (!connector || connector.status === "revoked") {
      return;
    }
    connector.lastSeenAt = new Date().toISOString();
    connector.status = "online";
  }

  markOffline(connectorId: string): void {
    const connector = this.connectors.get(connectorId);
    if (!connector || connector.status === "revoked") {
      return;
    }
    connector.status = "offline";
    connector.lastSeenAt = new Date().toISOString();
    if (this.activeConnectorId === connectorId) {
      this.activeConnectorId = null;
      this.controlEpoch += 1;
    }
    this.notifyChange();
  }

  revokeConnector(connectorId: string): void {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error("Connector not found");
    }
    connector.status = "revoked";
    connector.lastSeenAt = new Date().toISOString();
    if (this.activeConnectorId === connectorId) {
      this.activeConnectorId = null;
      this.controlEpoch += 1;
    }
    this.notifyChange();
  }

  setActiveTopology(topology: TopologyMode): ControllerSettings {
    this.settings.activeTopology = topology;
    this.controlEpoch += 1;
    this.notifyChange();
    return structuredClone(this.settings);
  }

  storeSnapshot(snapshot: Snapshot): Snapshot {
    this.latestSnapshot = structuredClone(snapshot);
    return structuredClone(snapshot);
  }

  submitTask(input: {
    title: string;
    goal: string;
    priority: number;
    author: string;
  }): AgentTask {
    const now = new Date().toISOString();
    const task: AgentTask = {
      id: randomUUID(),
      title: input.title,
      goal: input.goal,
      priority: input.priority,
      author: input.author,
      status: "QUEUED",
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    this.notifyChange();
    return structuredClone(task);
  }

  cancelTask(taskId: string): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    if (task.status === "SUCCEEDED" || task.status === "CANCELLED") {
      return structuredClone(task);
    }

    task.status = "CANCELLED";
    task.updatedAt = new Date().toISOString();
    this.notifyChange();
    return structuredClone(task);
  }

  listTasks(): AgentTask[] {
    return [...this.tasks.values()]
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return right.priority - left.priority;
        }
        return left.createdAt.localeCompare(right.createdAt);
      })
      .map((task) => structuredClone(task));
  }

  setControlOwner(owner: ControlOwner): { owner: ControlOwner; controlEpoch: number } {
    this.controlOwner = owner;
    this.controlEpoch += 1;
    this.notifyChange();
    return { owner: this.controlOwner, controlEpoch: this.controlEpoch };
  }

  listConnectors(): Array<Omit<ConnectorRecord, "tokenHash">> {
    return [...this.connectors.values()].map((connector) => {
      const { tokenHash: _tokenHash, ...publicConnector } = connector;
      return publicConnector;
    });
  }

  describe(): {
    onboarding: OnboardingState;
    settings: ControllerSettings;
    profiles: ProfileCatalog;
    controlEpoch: number;
    activeConnectorId: string | null;
    controlOwner: ControlOwner;
    tasks: AgentTask[];
    connectors: Array<Omit<ConnectorRecord, "tokenHash">>;
    snapshot: Snapshot | null;
  } {
    return {
      onboarding: this.getOnboardingState(),
      settings: structuredClone(this.settings),
      profiles: this.listProfiles(),
      controlEpoch: this.controlEpoch,
      activeConnectorId: this.activeConnectorId,
      controlOwner: this.controlOwner,
      tasks: this.listTasks(),
      connectors: this.listConnectors(),
      snapshot: this.latestSnapshot ? structuredClone(this.latestSnapshot) : null,
    };
  }

  exportSnapshot(): SerializedControllerState {
    return {
      onboarding: structuredClone(this.onboardingState),
      settings: structuredClone(this.settings),
      active: {
        clientProfileId: this.activeClientProfileId,
        serverProfileId: this.activeServerProfileId,
        authProfileId: this.activeAuthProfileId,
        brainProfileId: this.activeBrainProfileId,
      },
      clientProfiles: [...this.clientProfiles.values()].map((profile) => structuredClone(profile)),
      serverProfiles: [...this.serverProfiles.values()].map((profile) => structuredClone(profile)),
      authProfiles: [...this.authProfiles.values()].map((profile) => structuredClone(profile)),
      brainProfiles: [...this.brainProfiles.values()].map((profile) => structuredClone(profile)),
      connectors: [...this.connectors.values()].map((connector) => structuredClone(connector)),
      controlOwner: this.controlOwner,
      controlEpoch: this.controlEpoch,
      tasks: this.listTasks(),
    };
  }

  restoreSnapshot(input: unknown): void {
    const snapshot = serializedControllerStateSchema.parse(input);

    this.onboardingState.status = snapshot.onboarding.status;
    this.onboardingState.owner = snapshot.onboarding.owner;
    this.onboardingState.completedSteps = [...snapshot.onboarding.completedSteps];
    this.settings.activeTopology = snapshot.settings.activeTopology;
    this.settings.heartbeatIntervalMs = snapshot.settings.heartbeatIntervalMs;
    this.settings.connectorEndpoint = snapshot.settings.connectorEndpoint;
    this.activeClientProfileId = snapshot.active.clientProfileId;
    this.activeServerProfileId = snapshot.active.serverProfileId;
    this.activeAuthProfileId = snapshot.active.authProfileId;
    this.activeBrainProfileId = snapshot.active.brainProfileId;
    this.controlOwner = snapshot.controlOwner;
    this.controlEpoch = snapshot.controlEpoch;
    this.latestSnapshot = null;
    this.activeConnectorId = null;
    this.pairingGrants.clear();

    this.clientProfiles.clear();
    for (const profile of snapshot.clientProfiles) {
      this.clientProfiles.set(profile.id, structuredClone(profile));
    }

    this.serverProfiles.clear();
    for (const profile of snapshot.serverProfiles) {
      this.serverProfiles.set(profile.id, structuredClone(profile));
    }

    this.authProfiles.clear();
    for (const profile of snapshot.authProfiles) {
      this.authProfiles.set(profile.id, structuredClone(profile));
    }

    this.brainProfiles.clear();
    for (const profile of snapshot.brainProfiles) {
      this.brainProfiles.set(profile.id, structuredClone(profile));
    }

    this.connectors.clear();
    for (const connector of snapshot.connectors) {
      this.connectors.set(connector.id, {
        ...structuredClone(connector),
        status: "offline",
      });
    }

    this.tasks.clear();
    for (const task of snapshot.tasks) {
      this.tasks.set(task.id, structuredClone(task));
    }
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
