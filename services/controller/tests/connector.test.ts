import { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import { ControllerState } from "../src/domain/ControllerState.js";
import { buildServer } from "../src/http/server.js";

describe("connector WebSocket", () => {
  it("pairs a client connector and marks it offline after disconnect", async () => {
    const state = new ControllerState();
    const app = await buildServer({ state });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address() as AddressInfo;
    const grant = state.createPairingGrant("client_mod");

    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/connector`);
    const accepted = await new Promise<Record<string, unknown>>((resolve, reject) => {
      socket.once("error", reject);
      socket.once("message", (data) => {
        resolve(JSON.parse(data.toString()) as Record<string, unknown>);
      });
      socket.on("open", () => {
        socket.send(JSON.stringify({
          type: "pair.request",
          pairingCode: grant.code,
          connectorKind: "client_mod",
          connectorName: "test-client",
          protocolVersion: 1,
        }));
      });
    });

    expect(accepted.type).toBe("pair.accepted");
    expect(typeof accepted.connectorToken).toBe("string");

    state.setControlOwner("AGENT");
    const controlEpoch = state.describe().controlEpoch;
    const actionRequest = waitForMessage(socket, "action.request");
    const createAction = await app.inject({
      method: "POST",
      url: "/api/actions",
      payload: {
        actionType: "send_chat",
        parameters: { text: "hello" },
        controlEpoch,
      },
    });
    const request = await actionRequest;

    expect(createAction.statusCode).toBe(200);
    expect(request.actionType).toBe("send_chat");

    const actionResultAck = waitForMessage(socket, "action.result.ack");
    socket.send(JSON.stringify({
      type: "action.result",
      actionId: request.actionId,
      status: "SUCCEEDED",
      result: "sent through test connector",
    }));
    await actionResultAck;

    expect(state.listActions()[0]?.status).toBe("SUCCEEDED");

    const revokedMessage = waitForMessage(socket, "control.revoked");
    const controlResponse = await app.inject({
      method: "POST",
      url: "/api/control",
      payload: { owner: "HUMAN" },
    });
    const revoked = await revokedMessage;

    expect(controlResponse.statusCode).toBe(200);
    expect(revoked.owner).toBe("HUMAN");
    expect(revoked.controlEpoch).toBe(controlResponse.json().controlEpoch);

    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.once("close", () => resolve());
      socket.close();
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    const connectors = state.listConnectors();
    expect(connectors).toHaveLength(1);
    expect(connectors[0]?.status).toBe("offline");

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
