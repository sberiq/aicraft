import fastify from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import { z } from "zod";
import { ControllerState } from "../domain/ControllerState.js";
import type { ControllerStateStore } from "../persistence/sqlite.js";
import { SecretStore } from "../security/SecretStore.js";
import { connectorMessageSchema } from "../connector/messages.js";
import {
  activeProfilesSchema,
  authProfileSchema,
  brainProfileSchema,
  clientProfileSchema,
  createPairingSchema,
  createSecretSchema,
  createTaskSchema,
  requestActionSchema,
  serverProfileSchema,
  serverLoginSchema,
  setTopologySchema,
  setControlOwnerSchema,
  startOnboardingSchema,
} from "./schemas.js";

export interface BuildServerOptions {
  state?: ControllerState;
  store?: ControllerStateStore;
  secretStore?: SecretStore;
  version?: string;
}

export async function buildServer(options: BuildServerOptions = {}) {
  const state = options.state ?? new ControllerState();
  const version = options.version ?? "0.1.0";
  const connectorSockets = new Map<string, WebSocket>();
  const secretStore = options.secretStore;
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
  });

  await app.register(websocket);

  if (options.store) {
    const store = options.store;
    state.setChangeListener(() => store.save(state.exportSnapshot()));
    const persisted = store.load();
    if (persisted && !options.state) {
      state.restoreSnapshot(persisted);
    }
    app.addHook("onClose", async () => {
      store.close();
    });
  }

  if (secretStore) {
    app.addHook("onClose", async () => {
      secretStore.close();
    });
  }

  app.get("/api/health", async () => ({
    status: "ok",
    version,
  }));

  app.get("/api/status", async () => ({
    ...state.describe(),
    secrets: secretStore?.list() ?? [],
  }));
  app.get("/api/profiles", async () => state.listProfiles());

  app.post("/api/profiles/client", async (request) => {
    const input = clientProfileSchema.parse(request.body);
    return state.createClientProfile(input);
  });

  app.post("/api/profiles/server", async (request) => {
    const input = serverProfileSchema.parse(request.body);
    return state.createServerProfile(input);
  });

  app.post("/api/profiles/auth", async (request) => {
    const input = authProfileSchema.parse(request.body);
    return state.createAuthProfile(input);
  });

  app.post("/api/profiles/brain", async (request) => {
    const input = brainProfileSchema.parse(request.body);
    return state.createBrainProfile(input);
  });

  app.post("/api/profiles/active", async (request) => {
    const input = activeProfilesSchema.parse(request.body);
    return state.setActiveProfiles(input);
  });

  app.get("/api/tasks", async () => ({
    tasks: state.listTasks(),
  }));

  app.get("/api/actions", async () => ({
    actions: state.listActions(),
  }));

  app.get("/api/secrets", async () => ({
    secrets: secretStore?.list() ?? [],
  }));

  app.post("/api/secrets", async (request, reply) => {
    if (!secretStore) {
      return reply.status(503).send({
        error: {
          code: "SECRET_STORE_UNAVAILABLE",
          message: "Secret store is not configured",
        },
      });
    }

    const input = createSecretSchema.parse(request.body);
    const metadata = secretStore.put(input);
    return reply.status(201).send(metadata);
  });

  app.delete("/api/secrets/:id", async (request, reply) => {
    if (!secretStore) {
      return reply.status(503).send({
        error: {
          code: "SECRET_STORE_UNAVAILABLE",
          message: "Secret store is not configured",
        },
      });
    }

    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    if (!secretStore.delete(params.id)) {
      return reply.status(404).send({
        error: {
          code: "SECRET_NOT_FOUND",
          message: "Secret not found",
        },
      });
    }
    return { status: "deleted", secretId: params.id };
  });

  app.post("/api/actions", async (request, reply) => {
    const input = requestActionSchema.parse(request.body);
    const action = state.requestAction(input);
    const socket = connectorSockets.get(action.connectorId);

    if (!socket) {
      const failed = state.completeAction({
        actionId: action.id,
        status: "FAILED",
        result: "Client connector is not connected",
      });
      return reply.status(409).send(failed);
    }

    const wireAction =
      action.actionType === "server_login" && secretStore
        ? buildServerLoginAction(state, secretStore, action)
        : {
            type: "action.request",
            actionId: action.id,
            actionType: action.actionType,
            parameters: action.parameters,
            controlEpoch: action.controlEpoch,
          };

    socket.send(JSON.stringify(wireAction));
    return action;
  });

  app.post("/api/auth/login", async (request, reply) => {
    if (!secretStore) {
      return reply.status(503).send({
        error: {
          code: "SECRET_STORE_UNAVAILABLE",
          message: "Secret store is not configured",
        },
      });
    }

    const input = serverLoginSchema.parse(request.body);
    const action = state.requestAction({
      actionType: "server_login",
      parameters: { secretId: input.secretId },
      controlEpoch: state.describe().controlEpoch,
    });
    const socket = connectorSockets.get(action.connectorId);

    if (!socket) {
      const failed = state.completeAction({
        actionId: action.id,
        status: "FAILED",
        result: "Client connector is not connected",
      });
      return reply.status(409).send(failed);
    }

    socket.send(JSON.stringify(buildServerLoginAction(state, secretStore, action)));
    return {
      actionId: action.id,
      status: "PENDING",
    };
  });

  function buildServerLoginAction(
    state: ControllerState,
    secretStore: SecretStore,
    action: ReturnType<ControllerState["requestAction"]>,
  ): Record<string, unknown> {
    const secretId = action.parameters.secretId;
    const secret = secretId ? secretStore.get(secretId) : null;
    if (!secretId || !secret) {
      throw new Error("Login secret not found");
    }

    const status = state.describe();
    const serverProfile = status.profiles.serverProfiles.find(
      (profile) => profile.id === status.profiles.active.serverProfileId,
    );
    if (!serverProfile) {
      throw new Error("Active server profile not found");
    }

    const template = serverProfile.loginCommandTemplate ?? "/login {secret}";
    const command = template.replaceAll("{secret}", secret);

    return {
      type: "action.request",
      actionId: action.id,
      actionType: "send_command",
      parameters: { text: command },
      controlEpoch: action.controlEpoch,
    };
  }

  app.post("/api/tasks", async (request) => {
    const input = createTaskSchema.parse(request.body);
    return state.submitTask(input);
  });

  app.post("/api/tasks/:id/cancel", async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    return state.cancelTask(params.id);
  });

  app.post("/api/tasks/:id/run", async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    return state.runTask(params.id);
  });

  app.post("/api/control", async (request) => {
    const input = setControlOwnerSchema.parse(request.body);
    return state.setControlOwner(input.owner);
  });
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
          connectorSockets.set(paired.connector.id, socket);
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
        connectorSockets.set(connector.id, socket);
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

      if (message.type === "action.result") {
        state.completeAction({
          actionId: message.actionId,
          status: message.status,
          result: message.result,
          screenshotBase64: message.screenshotBase64,
        });
        socket.send(JSON.stringify({ type: "action.result.ack" }));
      } else {
        state.storeSnapshot(message.payload);
        socket.send(JSON.stringify({ type: "snapshot.ack" }));
      }
    });

    socket.on("close", () => {
      if (connectorId) {
        state.markOffline(connectorId);
        connectorSockets.delete(connectorId);
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
