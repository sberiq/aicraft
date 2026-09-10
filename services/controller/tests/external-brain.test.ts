import { AddressInfo } from "node:net";
import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import { ControllerState } from "../src/domain/ControllerState.js";
import { buildServer } from "../src/http/server.js";

describe("external brain mode", () => {
  it("requests a decision from an external endpoint and executes it through the client", async () => {
    const brainRequests: Array<Record<string, unknown>> = [];
    const brainServer = createServer((request, response) => {
      let rawBody = "";
      request.on("data", (chunk) => {
        rawBody += chunk.toString();
      });
      request.on("end", () => {
        const body = JSON.parse(rawBody) as Record<string, unknown>;
        brainRequests.push(body);
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({
          actionType: "send_chat",
          parameters: { text: "hello from external brain" },
          reasoning: "The external brain selected a safe chat action",
        }));
      });
    });
    await new Promise<void>((resolve) => brainServer.listen(0, "127.0.0.1", resolve));
    const brainAddress = brainServer.address() as AddressInfo;

    const state = new ControllerState();
    const brainProfile = state.createBrainProfile({
      mode: "EXTERNAL",
      endpoint: `http://127.0.0.1:${brainAddress.port}/decision`,
    });
    state.setActiveProfiles({ brainProfileId: brainProfile.id });

    const app = await buildServer({ state });
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
          connectorName: "external-brain-client",
          protocolVersion: 1,
        }));
        resolve();
      });
    });
    await waitForMessage(socket, "pair.accepted");
    state.setControlOwner("AGENT");

    const task = state.submitTask({
      title: "Say hello",
      goal: "Say hello through the external brain",
      priority: 10,
      author: "owner",
    });
    const actionRequest = waitForMessage(socket, "action.request");
    const response = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/run`,
    });
    const request = await actionRequest;

    expect(response.statusCode).toBe(200);
    expect(request.actionType).toBe("send_chat");
    const wireParameters = request.parameters as { text: string };
    expect(wireParameters.text).toBe("hello from external brain");
    expect(brainRequests[0]?.task).toMatchObject({
      id: task.id,
      goal: task.goal,
    });

    const actionResultAck = waitForMessage(socket, "action.result.ack");
    socket.send(JSON.stringify({
      type: "action.result",
      actionId: request.actionId,
      status: "SUCCEEDED",
      result: "external brain action completed",
    }));
    await actionResultAck;

    expect(state.listTasks()[0]?.status).toBe("SUCCEEDED");
    expect(state.listTasks()[0]?.result).toBe("external brain action completed");

    socket.close();
    await app.close();
    brainServer.close();
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
