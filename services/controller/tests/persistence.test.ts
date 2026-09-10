import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ControllerState } from "../src/domain/ControllerState.js";
import { SqliteControllerStateStore } from "../src/persistence/sqlite.js";

const directory = mkdtempSync(join(tmpdir(), "aicraft-state-"));

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("SQLite state persistence", () => {
  it("restores profiles, connectors, tasks, and control state", () => {
    const databasePath = join(directory, "state.sqlite");
    const firstStore = new SqliteControllerStateStore(databasePath);
    const firstState = new ControllerState();
    firstState.setChangeListener(() => firstStore.save(firstState.exportSnapshot()));

    const clientProfile = firstState.createClientProfile({
      name: "Remote 1.20.2",
      minecraftVersion: "1.20.2",
      fabricVersion: "0.91.6+1.20.2",
      javaVersion: "17",
      runner: "remote",
    });
    firstState.setActiveProfiles({ clientProfileId: clientProfile.id });
    firstState.setActiveTopology("REMOTE_CLIENT");
    firstState.setControlOwner("HUMAN");
    const task = firstState.submitTask({
      title: "Persist task",
      goal: "Verify state restoration",
      priority: 20,
      author: "owner",
    });
    firstStore.save(firstState.exportSnapshot());
    firstStore.close();

    const secondStore = new SqliteControllerStateStore(databasePath);
    const secondState = new ControllerState();
    secondState.restoreSnapshot(secondStore.load());
    const restored = secondState.describe();

    expect(restored.settings.activeTopology).toBe("REMOTE_CLIENT");
    expect(restored.controlOwner).toBe("HUMAN");
    expect(restored.profiles.active.clientProfileId).toBe(clientProfile.id);
    expect(restored.tasks[0]?.id).toBe(task.id);
    secondStore.close();
  });
});
