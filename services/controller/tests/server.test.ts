import { describe, expect, it } from "vitest";
import { buildServer } from "../src/http/server.js";

describe("controller HTTP API", () => {
  it("returns health and status", async () => {
    const app = await buildServer();
    const health = await app.inject({ method: "GET", url: "/api/health" });
    const status = await app.inject({ method: "GET", url: "/api/status" });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: "ok", version: "0.1.0" });
    expect(status.statusCode).toBe(200);
    expect(status.json().profiles.active.clientProfileId).toBeTruthy();
    await app.close();
  });

  it("returns the flagship profile catalog", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/profiles" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.active.clientProfileId).toBeTruthy();
    expect(body.clientProfiles).toHaveLength(1);
    expect(body.clientProfiles[0].minecraftVersion).toBe("1.20.2");
    expect(body.authProfiles[0].mode).toBe("OFFLINE_SERVER");
    await app.close();
  });

  it("creates and activates an offline identity through the API", async () => {
    const app = await buildServer();
    const created = await app.inject({
      method: "POST",
      url: "/api/profiles/auth",
      payload: {
        name: "Offline API identity",
        mode: "OFFLINE_SERVER",
        offlineNickname: "ApiCraft",
      },
    });
    const profile = created.json();

    expect(created.statusCode).toBe(200);
    expect(profile.offlineNickname).toBe("ApiCraft");

    const activated = await app.inject({
      method: "POST",
      url: "/api/profiles/active",
      payload: { authProfileId: profile.id },
    });
    const catalog = activated.json();

    expect(activated.statusCode).toBe(200);
    expect(catalog.active.authProfileId).toBe(profile.id);
    await app.close();
  });

  it("switches topology through the API", async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/topology",
      payload: { topology: "REMOTE_CLIENT" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().activeTopology).toBe("REMOTE_CLIENT");
    await app.close();
  });

  it("rejects invalid profile input", async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/profiles/client",
      payload: {
        name: "",
        minecraftVersion: "1.20.2",
        fabricVersion: "0.91.6+1.20.2",
        javaVersion: "17",
        runner: "local",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    await app.close();
  });

  it("creates and cancels a task through the API", async () => {
    const app = await buildServer();
    const created = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Mine oak",
        goal: "Collect 32 oak logs",
        priority: 10,
        author: "owner",
      },
    });
    const task = created.json();
    const cancelled = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/cancel`,
    });

    expect(created.statusCode).toBe(200);
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().status).toBe("CANCELLED");
    await app.close();
  });

  it("changes control owner through the API", async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/control",
      payload: { owner: "HUMAN" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().owner).toBe("HUMAN");
    await app.close();
  });

  it("creates and updates memory through the API", async () => {
    const app = await buildServer();
    const created = await app.inject({
      method: "POST",
      url: "/api/memory",
      payload: {
        kind: "project",
        title: "Bridge",
        content: "Build a bridge to the eastern island",
      },
    });
    const memory = created.json();
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/memory/${memory.id}`,
      payload: {
        title: "Eastern bridge",
        content: "Build a bridge to the eastern island and light it",
      },
    });

    expect(created.statusCode).toBe(200);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().title).toBe("Eastern bridge");
    await app.close();
  });
});
