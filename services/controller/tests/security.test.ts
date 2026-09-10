import { AddressInfo } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { ControllerState } from "../src/domain/ControllerState.js";
import { buildServer } from "../src/http/server.js";
import { SecretStore } from "../src/security/SecretStore.js";

const directory = mkdtempSync(join(tmpdir(), "aicraft-security-"));

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("server login security", () => {
  it("sends the decrypted command to the client without persisting the secret", async () => {
    const state = new ControllerState();
    const secretStore = new SecretStore(
      join(directory, "secrets.sqlite"),
      join(directory, "master.key"),
    );
    const app = await buildServer({ state, secretStore });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address() as AddressInfo;
    const grant = state.createPairingGrant("client_mod");

    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/connector`);
    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.once("open", () => {
        socket.send(JSON.stringify({
          type: "pair.request",
          pairingCode: grant.code,
          connectorKind: "client_mod",
          connectorName: "security-test-client",
          protocolVersion: 1,
        }));
        resolve();
      });
    });
    await waitForMessage(socket, "pair.accepted");
    state.setControlOwner("AGENT");

    const secretResponse = await app.inject({
      method: "POST",
      url: "/api/secrets",
      payload: {
        name: "AuthMe password",
        kind: "auth_password",
        value: "super-secret-password",
      },
    });
    const secret = secretResponse.json();
    expect(secretResponse.statusCode).toBe(201);
    expect(JSON.stringify(secret)).not.toContain("super-secret-password");

    const actionRequest = waitForMessage(socket, "action.request");
    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { secretId: secret.id },
    });
    const request = await actionRequest;

    expect(loginResponse.statusCode).toBe(200);
    expect(request.actionType).toBe("send_command");
    const wireParameters = request.parameters as { text: string };
    expect(wireParameters.text).toBe("/login super-secret-password");

    const actionResultAck = waitForMessage(socket, "action.result.ack");
    socket.send(JSON.stringify({
      type: "action.result",
      actionId: request.actionId,
      status: "SUCCEEDED",
      result: "login command sent",
    }));
    await actionResultAck;

    const action = state.listActions()[0];
    expect(action?.actionType).toBe("server_login");
    expect(action?.parameters.secretId).toBe(secret.id);
    expect(JSON.stringify(action)).not.toContain("super-secret-password");
    expect(JSON.stringify(state.exportSnapshot())).not.toContain("super-secret-password");

    socket.close();
    await app.close();
  });
});

function waitForMessage(socket: WebSocket, expectedType: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("message", handleMessage);
      reject(new Error(`Timed out waiting for ${expectedType}`));
    }, 2_000);

    function handleMessage(data: unknown) {
      const message = JSON.parse(String(data)) as Record<string, unknown>;
      if (message.type === expectedType) {
        clearTimeout(timeout);
        socket.off("message", handleMessage);
        resolve(message);
      }
    }

    socket.on("message", handleMessage);
    socket.once("error", reject);
  });
}
