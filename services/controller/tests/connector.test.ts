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
