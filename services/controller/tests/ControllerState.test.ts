import { describe, expect, it } from "vitest";
import { ControllerState } from "../src/domain/ControllerState.js";

describe("ControllerState", () => {
  it("starts and completes onboarding", () => {
    const state = new ControllerState();
    state.startOnboarding("Owner");
    expect(state.getOnboardingState().status).toBe("in_progress");
    state.completeOnboarding();
    expect(state.getOnboardingState().status).toBe("completed");
  });

  it("pairs a client connector and returns a one-time token", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    const paired = state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Home client",
      protocolVersion: 1,
    });

    expect(paired.connector.kind).toBe("client_mod");
    expect(paired.connectorToken).toHaveLength(43);
    expect(state.authenticateConnector(paired.connectorToken)?.id).toBe(paired.connector.id);
  });

  it("rejects an already used pairing code", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Home client",
      protocolVersion: 1,
    });

    expect(() => state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Another client",
      protocolVersion: 1,
    })).toThrow();
  });

  it("revokes a connector and increments the control epoch", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    const paired = state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Home client",
      protocolVersion: 1,
    });
    const before = state.describe().controlEpoch;
    state.revokeConnector(paired.connector.id);
    const after = state.describe();

    expect(after.controlEpoch).toBeGreaterThan(before);
    expect(after.activeConnectorId).toBeNull();
    expect(state.authenticateConnector(paired.connectorToken)).toBeNull();
  });

  it("switches between local and remote-client topologies", () => {
    const state = new ControllerState();
    expect(state.describe().settings.activeTopology).toBe("LOCAL");
    state.setActiveTopology("REMOTE_CLIENT");
    expect(state.describe().settings.activeTopology).toBe("REMOTE_CLIENT");
    state.setActiveTopology("LOCAL");
    expect(state.describe().settings.activeTopology).toBe("LOCAL");
  });

  it("creates the flagship Minecraft 1.20.2 profile", () => {
    const state = new ControllerState();
    const profiles = state.listProfiles();
    const activeClient = profiles.clientProfiles.find(
      (profile) => profile.id === profiles.active.clientProfileId,
    );

    expect(activeClient?.minecraftVersion).toBe("1.20.2");
    expect(activeClient?.javaVersion).toBe("17");
  });

  it("creates and activates an offline auth profile", () => {
    const state = new ControllerState();
    const profile = state.createAuthProfile({
      name: "Offline agent",
      mode: "OFFLINE_SERVER",
      offlineNickname: "AiCraftAgent",
    });
    const profiles = state.setActiveProfiles({ authProfileId: profile.id });

    expect(profiles.active.authProfileId).toBe(profile.id);
    expect(profiles.authProfiles.find((item) => item.id === profile.id)?.offlineNickname).toBe(
      "AiCraftAgent",
    );
  });

  it("creates and activates an external brain profile", () => {
    const state = new ControllerState();
    const profile = state.createBrainProfile({
      mode: "EXTERNAL",
      endpoint: "https://agent.example.com/brain",
    });
    const profiles = state.setActiveProfiles({ brainProfileId: profile.id });

    expect(profiles.active.brainProfileId).toBe(profile.id);
    expect(profiles.brainProfiles.find((item) => item.id === profile.id)?.mode).toBe("EXTERNAL");
  });

  it("rejects an external brain profile without endpoint", () => {
    const state = new ControllerState();
    expect(() => state.createBrainProfile({ mode: "EXTERNAL" })).toThrow();
  });

  it("submits and cancels a task", () => {
    const state = new ControllerState();
    const task = state.submitTask({
      title: "Mine oak",
      goal: "Collect 32 oak logs",
      priority: 10,
      author: "owner",
    });
    const cancelled = state.cancelTask(task.id);

    expect(task.status).toBe("QUEUED");
    expect(cancelled.status).toBe("CANCELLED");
    expect(state.listTasks()[0]?.id).toBe(task.id);
  });

  it("increments control epoch when control owner changes", () => {
    const state = new ControllerState();
    const before = state.describe().controlEpoch;
    state.setControlOwner("HUMAN");
    const after = state.describe();

    expect(after.controlOwner).toBe("HUMAN");
    expect(after.controlEpoch).toBeGreaterThan(before);
  });
});
