import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  type BrainProfile,
  type ClientProfile,
  type AuthProfile,
  type AgentTask,
  type ActionRecord,
  type CapturedScreenshot,
  type ControlOwner,
  type ConnectorKind,
  type ConnectorRecord,
  type ControllerSettings,
  type MemoryRecord,
  type MemoryUpdateInput,
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
  private latestScreenshot: CapturedScreenshot | null = null;
  private changeListener: (() => void) | null = null;
  private readonly tasks = new Map<string, AgentTask>();
  private readonly actions = new Map<string, ActionRecord>();
  private readonly memories = new Map<string, MemoryRecord>();
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

  requestAction(input: {
    actionType: ActionRecord["actionType"];
    parameters: ActionRecord["parameters"];
    controlEpoch: number;
    taskId?: string | undefined;
  }): ActionRecord {
    if (!this.activeConnectorId) {
      throw new Error("No active client connector");
    }

    if (this.controlOwner !== "AGENT") {
      throw new Error("Agent does not own control");
    }

    if (input.controlEpoch !== this.controlEpoch) {
      throw new Error("Control epoch mismatch");
    }

    const action: ActionRecord = {
      id: randomUUID(),
      taskId: input.taskId,
      connectorId: this.activeConnectorId,
      actionType: input.actionType,
      parameters: structuredClone(input.parameters),
      status: "PENDING",
      controlEpoch: input.controlEpoch,
      requestedAt: new Date().toISOString(),
      completedAt: null,
    };
    this.actions.set(action.id, action);
    this.notifyChange();
    return structuredClone(action);
  }

  completeAction(input: {
    actionId: string;
    status: ActionRecord["status"];
    result?: string | undefined;
    screenshotBase64?: string | undefined;
  }): ActionRecord {
    const action = this.actions.get(input.actionId);
    if (!action) {
      throw new Error("Action not found");
    }

    action.status = input.status;
    action.result = input.result;
    action.completedAt = new Date().toISOString();

    if (input.screenshotBase64) {
      this.latestScreenshot = {
        actionId: action.id,
        dataUrl: `data:image/png;base64,${input.screenshotBase64}`,
        capturedAt: action.completedAt,
      };
    }

    if (action.taskId) {
      const task = this.tasks.get(action.taskId);
      if (task && task.status !== "CANCELLED") {
        task.status = input.status === "SUCCEEDED" ? "SUCCEEDED" : input.status === "UNKNOWN" ? "BLOCKED" : "FAILED";
        task.result = input.result;
        task.updatedAt = action.completedAt;
      }
    }

    this.notifyChange();
    return structuredClone(action);
  }

  listActions(): ActionRecord[] {
    return [...this.actions.values()]
      .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt))
      .map((action) => structuredClone(action));
  }

  createMemory(input: Omit<MemoryRecord, "id" | "createdAt" | "updatedAt">): MemoryRecord {
    const now = new Date().toISOString();
    const record: MemoryRecord = {
      id: randomUUID(),
      ...structuredClone(input),
      createdAt: now,
      updatedAt: now,
    };
    this.memories.set(record.id, record);
    this.notifyChange();
    return structuredClone(record);
  }

  listMemories(): MemoryRecord[] {
    return [...this.memories.values()]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((record) => structuredClone(record));
  }

  updateMemory(
    id: string,
    input: MemoryUpdateInput,
  ): MemoryRecord {
    const record = this.memories.get(id);
    if (!record) {
      throw new Error("Memory record not found");
    }

    if (input.kind !== undefined) record.kind = input.kind;
    if (input.title !== undefined) record.title = input.title;
    if (input.content !== undefined) record.content = input.content;
    if (input.serverProfileId !== undefined) record.serverProfileId = input.serverProfileId;
    if (input.dimension !== undefined) record.dimension = input.dimension;
    if (input.position !== undefined) record.position = structuredClone(input.position);
    record.updatedAt = new Date().toISOString();

    this.notifyChange();
    return structuredClone(record);
  }

  deleteMemory(id: string): void {
    if (!this.memories.delete(id)) {
      throw new Error("Memory record not found");
    }
    this.notifyChange();
  }

  runTask(taskId: string): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "QUEUED" && task.status !== "BLOCKED") {
      throw new Error("Task is not runnable");
    }

    const brain = this.activeBrainProfileId
      ? this.brainProfiles.get(this.activeBrainProfileId)
      : undefined;
    if (!brain || brain.mode !== "BUILT_IN") {
      throw new Error("Built-in brain is not active");
    }

    const plan = planBuiltInTask(task.goal);
    if (!plan) {
      task.status = "BLOCKED";
      task.result = "No supported built-in skill for this goal";
      task.updatedAt = new Date().toISOString();
      this.notifyChange();
      return structuredClone(task);
    }

    const action = this.requestAction({
      actionType: plan.actionType,
      parameters:
        plan.actionType === "send_chat" || plan.actionType === "send_command"
          ? { text: plan.text }
          : plan.actionType === "set_render_mode"
            ? { mode: plan.mode }
            : plan.actionType === "set_movement"
              ? { movement: plan.movement }
              : plan.actionType === "look"
                ? { yaw: plan.yaw, pitch: plan.pitch }
              : plan.actionType === "select_hotbar"
                ? { slot: plan.slot }
              : plan.actionType === "navigate_to"
                  ? {
                      x: plan.x,
                      z: plan.z,
                      tolerance: plan.tolerance,
                      timeoutMs: plan.timeoutMs,
                    }
                  : plan.actionType === "screen_click"
                    ? {
                        pointerX: plan.pointerX,
                        pointerY: plan.pointerY,
                        button: plan.button,
                      }
                    : plan.actionType === "screen_scroll"
                      ? {
                          pointerX: plan.pointerX,
                          pointerY: plan.pointerY,
                          amount: plan.amount,
                        }
                      : plan.actionType === "click_slot"
                        ? {
                            inventorySlot: plan.inventorySlot,
                            button: plan.button,
                            slotActionType: plan.slotActionType,
                          }
                        : {},
      controlEpoch: this.controlEpoch,
      taskId: task.id,
    });

    task.status = "RUNNING";
    task.result = `Action ${action.id} requested`;
    task.updatedAt = new Date().toISOString();
    this.notifyChange();
    return structuredClone(task);
  }

  runTaskWithPlan(taskId: string, plan: {
    actionType: ActionRecord["actionType"];
    parameters: ActionRecord["parameters"];
    reasoning?: string | undefined;
  }): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "QUEUED" && task.status !== "BLOCKED") {
      throw new Error("Task is not runnable");
    }

    const action = this.requestAction({
      actionType: plan.actionType,
      parameters: plan.parameters,
      controlEpoch: this.controlEpoch,
      taskId: task.id,
    });

    task.status = "RUNNING";
    task.result = plan.reasoning ?? `Action ${action.id} requested`;
    task.updatedAt = new Date().toISOString();
    this.notifyChange();
    return structuredClone(task);
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
    actions: ActionRecord[];
    memories: MemoryRecord[];
    screenshot: CapturedScreenshot | null;
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
      actions: this.listActions(),
      memories: this.listMemories(),
      screenshot: this.latestScreenshot ? structuredClone(this.latestScreenshot) : null,
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
      actions: this.listActions(),
      memories: this.listMemories(),
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

    this.actions.clear();
    for (const action of snapshot.actions) {
      this.actions.set(action.id, structuredClone(action));
    }

    this.memories.clear();
    for (const memory of snapshot.memories) {
      this.memories.set(memory.id, structuredClone(memory));
    }
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function planBuiltInTask(goal: string):
  | {
      actionType: "send_chat" | "send_command";
      text: string;
    }
  | {
      actionType: "set_render_mode";
      mode: "ECONOMY" | "OBSERVE" | "INTERACTIVE";
    }
  | {
      actionType: "capture_screenshot";
    }
  | {
      actionType: "set_movement";
      movement: {
        forward: boolean;
        back: boolean;
        left: boolean;
        right: boolean;
        jump: boolean;
        sneak: boolean;
        sprint: boolean;
      };
    }
  | {
      actionType: "look";
      yaw: number;
      pitch: number;
    }
  | {
      actionType: "select_hotbar";
      slot: number;
    }
  | {
      actionType: "attack";
    }
  | {
      actionType: "use_item";
    }
  | {
      actionType: "open_inventory";
    }
  | {
      actionType: "close_screen";
    }
  | {
      actionType: "drop_item";
    }
  | {
      actionType: "navigate_to";
      x: number;
      z: number;
      tolerance: number;
      timeoutMs: number;
    }
  | {
      actionType: "cancel_navigation";
    }
  | {
      actionType: "screen_click";
      pointerX: number;
      pointerY: number;
      button: number;
    }
  | {
      actionType: "screen_scroll";
      pointerX: number;
      pointerY: number;
      amount: number;
    }
  | {
      actionType: "click_slot";
      inventorySlot: number;
      button: number;
      slotActionType: "pickup" | "quick_move" | "swap" | "throw";
    }
  | null {
  const chatMatch = /^send chat:\s*(.+)$/i.exec(goal);
  if (chatMatch?.[1]) {
    return { actionType: "send_chat", text: chatMatch[1] };
  }

  const commandMatch = /^send command:\s*(.+)$/i.exec(goal);
  if (commandMatch?.[1]) {
    return { actionType: "send_command", text: commandMatch[1] };
  }

  const renderModeMatch = /^set render mode:\s*(ECONOMY|OBSERVE|INTERACTIVE)$/i.exec(goal);
  if (renderModeMatch?.[1]) {
    return {
      actionType: "set_render_mode",
      mode: renderModeMatch[1].toUpperCase() as "ECONOMY" | "OBSERVE" | "INTERACTIVE",
    };
  }

  if (/^capture screenshot$/i.test(goal)) {
    return { actionType: "capture_screenshot" };
  }

  const lookMatch = /^look:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/i.exec(goal);
  if (lookMatch?.[1] && lookMatch[2]) {
    return {
      actionType: "look",
      yaw: Number(lookMatch[1]),
      pitch: Number(lookMatch[2]),
    };
  }

  const hotbarMatch = /^select hotbar:\s*([1-9])$/i.exec(goal);
  if (hotbarMatch?.[1]) {
    return { actionType: "select_hotbar", slot: Number(hotbarMatch[1]) };
  }

  if (/^attack$/i.test(goal)) {
    return { actionType: "attack" };
  }

  if (/^use item$/i.test(goal)) {
    return { actionType: "use_item" };
  }

  if (/^open inventory$/i.test(goal)) {
    return { actionType: "open_inventory" };
  }

  if (/^close screen$/i.test(goal)) {
    return { actionType: "close_screen" };
  }

  if (/^drop item$/i.test(goal)) {
    return { actionType: "drop_item" };
  }

  const navigateMatch =
      /^navigate to:\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(?:\s+([0-9]*\.?[0-9]+))?(?:\s+([0-9]+))?$/i
          .exec(goal);
  if (navigateMatch?.[1] && navigateMatch[2]) {
    return {
      actionType: "navigate_to",
      x: Number(navigateMatch[1]),
      z: Number(navigateMatch[2]),
      tolerance: navigateMatch[3] ? Number(navigateMatch[3]) : 1.5,
      timeoutMs: navigateMatch[4] ? Number(navigateMatch[4]) : 120_000,
    };
  }

  if (/^cancel navigation$/i.test(goal)) {
    return { actionType: "cancel_navigation" };
  }

  const screenClickMatch =
      /^click screen:\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(?:\s+([0-2]))?$/i
          .exec(goal);
  if (screenClickMatch?.[1] && screenClickMatch[2]) {
    return {
      actionType: "screen_click",
      pointerX: Number(screenClickMatch[1]),
      pointerY: Number(screenClickMatch[2]),
      button: screenClickMatch[3] ? Number(screenClickMatch[3]) : 0,
    };
  }

  const screenScrollMatch =
      /^scroll screen:\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/i
          .exec(goal);
  if (screenScrollMatch?.[1] && screenScrollMatch[2] && screenScrollMatch[3]) {
    return {
      actionType: "screen_scroll",
      pointerX: Number(screenScrollMatch[1]),
      pointerY: Number(screenScrollMatch[2]),
      amount: Number(screenScrollMatch[3]),
    };
  }

  const clickSlotMatch =
      /^click slot:\s*(-?\d+)\s+([0-2])\s+(pickup|quick_move|swap|throw)$/i
          .exec(goal);
  if (clickSlotMatch?.[1] && clickSlotMatch[2] && clickSlotMatch[3]) {
    return {
      actionType: "click_slot",
      inventorySlot: Number(clickSlotMatch[1]),
      button: Number(clickSlotMatch[2]),
      slotActionType: clickSlotMatch[3].toLowerCase() as
        | "pickup"
        | "quick_move"
        | "swap"
        | "throw",
    };
  }

  const movementMatch = /^set movement:\s*(.*)$/i.exec(goal);
  if (movementMatch?.[1] !== undefined) {
    const enabled = new Set(
      movementMatch[1]
        .split(",")
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean),
    );
    const stop = enabled.has("stop");
    return {
      actionType: "set_movement",
      movement: {
        forward: !stop && enabled.has("forward"),
        back: !stop && enabled.has("back"),
        left: !stop && enabled.has("left"),
        right: !stop && enabled.has("right"),
        jump: !stop && enabled.has("jump"),
        sneak: !stop && enabled.has("sneak"),
        sprint: !stop && enabled.has("sprint"),
      },
    };
  }

  return null;
}
