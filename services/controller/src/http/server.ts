import fastify from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import { z } from "zod";
import { ControllerState } from "../domain/ControllerState.js";
import { connectorMessageSchema } from "../connector/messages.js";
import {
  createPairingSchema,
  setTopologySchema,
  startOnboardingSchema,
} from "./schemas.js";

export interface BuildServerOptions {
  state?: ControllerState;
  version?: string;
}

export async function buildServer(options: BuildServerOptions = {}) {
  const state = options.state ?? new ControllerState();
  const version = options.version ?? "0.1.0";
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
  });

  await app.register(websocket);

  app.get("/api/health", async () => ({
    status: "ok",
    version,
  }));

  app.get("/api/status", async () => state.describe());
  app.get("/api/onboarding", async () => state.getOnboardingState());

  app.post("/api/onboarding/start", async (request, reply) => {
    const input = startOnboardingSchema.parse(request.body);
    return state.startOnboarding(input.displayName);
  });

  app.post("/api/onboarding/complete", async () => state.completeOnboarding());

  app.post("/api/connectors/pair", async (request) => {
    const input = createPairingSchema.parse(request.body);
    const grant = state.createPairingGrant(input.kind);
    return {
      ...grant,
      connectorEndpoint: "/connector",
      expiresInSeconds: 900,
    };
  });

  app.get("/api/connectors", async () => ({
    connectors: state.listConnectors(),
  }));

  app.delete("/api/connectors/:id/token", async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    state.revokeConnector(params.id);
    return { status: "revoked", connectorId: params.id };
  });

  app.post("/api/topology", async (request) => {
    const input = setTopologySchema.parse(request.body);
    return state.setActiveTopology(input.topology);
  });

  app.get("/connector", { websocket: true }, (socket: WebSocket) => {
    let connectorId: string | null = null;

    socket.on("message", (rawMessage) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawMessage.toString("utf8"));
      } catch {
        socket.send(JSON.stringify({ type: "error", code: "INVALID_JSON" }));
        return;
      }

      const parseResult = connectorMessageSchema.safeParse(parsed);
      if (!parseResult.success) {
        socket.send(JSON.stringify({ type: "error", code: "INVALID_MESSAGE" }));
        return;
      }

      const message = parseResult.data;
      if (message.type === "pair.request") {
        try {
          const paired = state.pairConnector({
            pairingCode: message.pairingCode,
            kind: message.connectorKind,
            name: message.connectorName,
            protocolVersion: message.protocolVersion,
          });
          connectorId = paired.connector.id;
          socket.send(JSON.stringify({
            type: "pair.accepted",
            connectorId: paired.connector.id,
            connectorToken: paired.connectorToken,
            heartbeatIntervalMs: 5_000,
          }));
        } catch {
          socket.send(JSON.stringify({ type: "pair.rejected", code: "INVALID_PAIRING" }));
        }
        return;
      }

      if (message.type === "auth.request") {
        const connector = state.authenticateConnector(message.connectorToken);
        if (!connector) {
          socket.send(JSON.stringify({ type: "auth.rejected" }));
          return;
        }
        connectorId = connector.id;
        socket.send(JSON.stringify({
          type: "auth.accepted",
          connectorId: connector.id,
          heartbeatIntervalMs: 5_000,
        }));
        return;
      }

      if (!connectorId) {
        socket.send(JSON.stringify({ type: "error", code: "NOT_AUTHENTICATED" }));
        return;
      }

      if (message.type === "heartbeat") {
        state.markHeartbeat(connectorId);
        socket.send(JSON.stringify({ type: "heartbeat.ack" }));
        return;
      }

      state.storeSnapshot(message.payload);
      socket.send(JSON.stringify({ type: "snapshot.ack" }));
    });

    socket.on("close", () => {
      if (connectorId) {
        state.markOffline(connectorId);
      }
    });
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.issues,
        },
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected controller error",
      },
    });
  });

  return app;
}
