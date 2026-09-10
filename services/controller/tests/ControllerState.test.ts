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
});
