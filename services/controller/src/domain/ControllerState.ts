import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  type BrainProfile,
  type ClientProfile,
  type ConnectorKind,
  type ConnectorRecord,
  type ControllerSettings,
  type OnboardingState,
  type OwnerProfile,
  type PairingGrant,
  type ServerProfile,
  type Snapshot,
  type TopologyMode,
} from "./types.js";

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
  private readonly brainProfiles = new Map<string, BrainProfile>();
  private activeConnectorId: string | null = null;
  private controlEpoch = 1;
  private latestSnapshot: Snapshot | null = null;

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
    return this.getOnboardingState();
  }

  completeOnboarding(): OnboardingState {
    if (this.onboardingState.status === "not_started") {
      throw new Error("Onboarding has not been started");
    }

    this.onboardingState.status = "completed";
    return this.getOnboardingState();
  }

  getOnboardingState(): OnboardingState {
    return structuredClone(this.onboardingState);
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
  }

  setActiveTopology(topology: TopologyMode): ControllerSettings {
    this.settings.activeTopology = topology;
    this.controlEpoch += 1;
    return structuredClone(this.settings);
  }

  storeSnapshot(snapshot: Snapshot): Snapshot {
    this.latestSnapshot = structuredClone(snapshot);
    return structuredClone(snapshot);
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
    controlEpoch: number;
    activeConnectorId: string | null;
    connectors: Array<Omit<ConnectorRecord, "tokenHash">>;
    snapshot: Snapshot | null;
  } {
    return {
      onboarding: this.getOnboardingState(),
      settings: structuredClone(this.settings),
      controlEpoch: this.controlEpoch,
      activeConnectorId: this.activeConnectorId,
      connectors: this.listConnectors(),
      snapshot: this.latestSnapshot ? structuredClone(this.latestSnapshot) : null,
    };
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
