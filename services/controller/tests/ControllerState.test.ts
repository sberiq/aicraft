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

  it("creates and completes a client action with the current control epoch", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    const paired = state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Action client",
      protocolVersion: 1,
    });
    state.setControlOwner("AGENT");
    const controlEpoch = state.describe().controlEpoch;
    const action = state.requestAction({
      actionType: "send_chat",
      parameters: { text: "hello" },
      controlEpoch,
    });
    const completed = state.completeAction({
      actionId: action.id,
      status: "SUCCEEDED",
      result: "sent",
    });

    expect(action.connectorId).toBe(paired.connector.id);
    expect(action.status).toBe("PENDING");
    expect(completed.status).toBe("SUCCEEDED");
    expect(state.listActions()[0]?.id).toBe(action.id);
  });

  it("rejects an action with a stale control epoch", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Action client",
      protocolVersion: 1,
    });
    state.setControlOwner("AGENT");

    expect(() => state.requestAction({
      actionType: "send_chat",
      parameters: { text: "hello" },
      controlEpoch: 1,
    })).toThrow();
  });

  it("runs a supported built-in task and closes it from the action result", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Brain client",
      protocolVersion: 1,
    });
    state.setControlOwner("AGENT");
    const task = state.submitTask({
      title: "Say hello",
      goal: "send chat: Hello from aicraft",
      priority: 10,
      author: "owner",
    });
    const running = state.runTask(task.id);
    const action = state.listActions()[0];
    expect(running.status).toBe("RUNNING");
    expect(action?.taskId).toBe(task.id);
    expect(action?.parameters.text).toBe("Hello from aicraft");

    state.completeAction({
      actionId: action?.id ?? "",
      status: "SUCCEEDED",
      result: "sent",
    });
    const completed = state.listTasks()[0];
    expect(completed?.status).toBe("SUCCEEDED");
    expect(completed?.result).toBe("sent");
  });

  it("blocks a built-in task with an unsupported goal", () => {
    const state = new ControllerState();
    const task = state.submitTask({
      title: "Unsupported",
      goal: "mine diamonds",
      priority: 1,
      author: "owner",
    });
    const blocked = state.runTask(task.id);

    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.result).toContain("No supported built-in skill");
  });

  it("runs a movement task through the built-in planner", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Movement client",
      protocolVersion: 1,
    });
    state.setControlOwner("AGENT");
    const task = state.submitTask({
      title: "Move forward",
      goal: "set movement: forward, sprint",
      priority: 1,
      author: "owner",
    });
    state.runTask(task.id);
    const action = state.listActions()[0];

    expect(action?.actionType).toBe("set_movement");
    expect(action?.parameters.movement?.forward).toBe(true);
    expect(action?.parameters.movement?.sprint).toBe(true);
    expect(action?.parameters.movement?.back).toBe(false);
  });

  it("runs a render-mode task through the built-in planner", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Render client",
      protocolVersion: 1,
    });
    state.setControlOwner("AGENT");
    const task = state.submitTask({
      title: "Enable observation",
      goal: "set render mode: OBSERVE",
      priority: 1,
      author: "owner",
    });
    state.runTask(task.id);
    const action = state.listActions()[0];

    expect(action?.actionType).toBe("set_render_mode");
    expect(action?.parameters.mode).toBe("OBSERVE");
  });

  it("stores the latest screenshot without persisting it in actions", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Screenshot client",
      protocolVersion: 1,
    });
    state.setControlOwner("AGENT");
    const action = state.requestAction({
      actionType: "capture_screenshot",
      parameters: {},
      controlEpoch: state.describe().controlEpoch,
    });
    state.completeAction({
      actionId: action.id,
      status: "SUCCEEDED",
      result: "Screenshot captured",
      screenshotBase64: "aWNjcmFmdC1zbW9rZS1wbmc=",
    });

    expect(state.describe().screenshot?.dataUrl).toBe(
      "data:image/png;base64,aWNjcmFmdC1zbW9rZS1wbmc=",
    );
    expect(state.exportSnapshot().actions[0]?.result).toBe("Screenshot captured");
  });

  it("plans look and hotbar tasks", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Basic skill client",
      protocolVersion: 1,
    });
    state.setControlOwner("AGENT");
    const lookTask = state.submitTask({
      title: "Look north",
      goal: "look: -12.5, 7.25",
      priority: 1,
      author: "owner",
    });
    state.runTask(lookTask.id);
    const hotbarTask = state.submitTask({
      title: "Select sword",
      goal: "select hotbar: 2",
      priority: 1,
      author: "owner",
    });
    state.runTask(hotbarTask.id);

    const actions = state.listActions();
    expect(actions[0]?.actionType).toBe("look");
    expect(actions[0]?.parameters.yaw).toBe(-12.5);
    expect(actions[0]?.parameters.pitch).toBe(7.25);
    expect(actions[1]?.actionType).toBe("select_hotbar");
    expect(actions[1]?.parameters.slot).toBe(2);
  });

  it("plans simple inventory and interaction tasks", () => {
    const state = new ControllerState();
    const grant = state.createPairingGrant("client_mod");
    state.pairConnector({
      pairingCode: grant.code,
      kind: "client_mod",
      name: "Inventory client",
      protocolVersion: 1,
    });
    state.setControlOwner("AGENT");
    const goals = [
      { title: "Open inventory", goal: "open inventory", actionType: "open_inventory" },
      { title: "Attack", goal: "attack", actionType: "attack" },
      { title: "Use item", goal: "use item", actionType: "use_item" },
      { title: "Close screen", goal: "close screen", actionType: "close_screen" },
      { title: "Drop item", goal: "drop item", actionType: "drop_item" },
    ];

    for (const goal of goals) {
      const task = state.submitTask({
        title: goal.title,
        goal: goal.goal,
        priority: 1,
        author: "owner",
      });
      state.runTask(task.id);
    }

    const actions = state.listActions();
    expect(actions.map((action) => action.actionType)).toEqual(goals.map((goal) => goal.actionType));
  });

  it("creates, updates, and deletes memory records", () => {
    const state = new ControllerState();
    const memory = state.createMemory({
      kind: "place",
      title: "Home",
      content: "Base near the spawn plateau",
      dimension: "minecraft:overworld",
      position: { x: 10, y: 64, z: -20 },
    });
    const updated = state.updateMemory(memory.id, {
      title: "Main base",
      content: "Oak base with storage and furnace",
    });

    expect(updated.title).toBe("Main base");
    expect(updated.position?.x).toBe(10);
    expect(state.listMemories()).toHaveLength(1);
    state.deleteMemory(memory.id);
    expect(state.listMemories()).toHaveLength(0);
  });
});
