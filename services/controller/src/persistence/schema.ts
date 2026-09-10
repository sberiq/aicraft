import { z } from "zod";

export const serializedControllerStateSchema = z.object({
  onboarding: z.object({
    status: z.enum(["not_started", "in_progress", "completed"]),
    owner: z
      .object({
        id: z.string().uuid(),
        displayName: z.string(),
        createdAt: z.string().datetime(),
      })
      .nullable(),
    completedSteps: z.array(z.string()),
  }),
  settings: z.object({
    activeTopology: z.enum(["LOCAL", "REMOTE_CLIENT"]),
    heartbeatIntervalMs: z.number().int().positive(),
    connectorEndpoint: z.string(),
  }),
  active: z.object({
    clientProfileId: z.string().uuid().nullable(),
    serverProfileId: z.string().uuid().nullable(),
    authProfileId: z.string().uuid().nullable(),
    brainProfileId: z.string().uuid().nullable(),
  }),
  clientProfiles: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      minecraftVersion: z.string(),
      fabricVersion: z.string(),
      javaVersion: z.string(),
      runner: z.enum(["local", "remote"]),
    }),
  ),
  serverProfiles: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      address: z.string(),
      port: z.number().int().min(1).max(65535),
      minecraftVersion: z.string(),
      authMode: z.enum(["MICROSOFT", "OFFLINE_SERVER"]),
      offlineNickname: z.string().optional(),
      clientProfileId: z.string().uuid(),
    }),
  ),
  authProfiles: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      mode: z.enum(["MICROSOFT", "OFFLINE_SERVER"]),
      offlineNickname: z.string().optional(),
    }),
  ),
  brainProfiles: z.array(
    z.object({
      id: z.string().uuid(),
      mode: z.enum(["BUILT_IN", "EXTERNAL"]),
      endpoint: z.string().optional(),
      model: z.string().optional(),
      dailyCallLimit: z.number().int().min(0).optional(),
    }),
  ),
  connectors: z.array(
    z.object({
      id: z.string().uuid(),
      kind: z.enum(["client_mod", "server_plugin"]),
      name: z.string(),
      tokenHash: z.string().length(64),
      status: z.enum(["offline", "online", "revoked"]),
      protocolVersion: z.number().int().positive(),
      createdAt: z.string().datetime(),
      lastSeenAt: z.string().datetime().nullable(),
    }),
  ),
  controlOwner: z.enum(["NONE", "AGENT", "HUMAN"]),
  controlEpoch: z.number().int().positive(),
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      goal: z.string(),
      status: z.enum(["QUEUED", "RUNNING", "BLOCKED", "SUCCEEDED", "FAILED", "CANCELLED"]),
      priority: z.number().int().min(0),
      author: z.string(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
      result: z.string().optional(),
    }),
  ),
  actions: z.array(
    z.object({
      id: z.string().uuid(),
      taskId: z.string().uuid().optional(),
      connectorId: z.string().uuid(),
      actionType: z.enum(["send_chat", "send_command"]),
      parameters: z.object({
        text: z.string(),
      }),
      status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "UNKNOWN"]),
      controlEpoch: z.number().int().positive(),
      requestedAt: z.string().datetime(),
      completedAt: z.string().datetime().nullable(),
      result: z.string().optional(),
    }),
  ).default([]),
});

export type SerializedControllerState = z.infer<typeof serializedControllerStateSchema>;
