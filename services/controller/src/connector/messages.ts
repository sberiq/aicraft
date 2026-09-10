import { z } from "zod";

export const connectorMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("pair.request"),
    pairingCode: z.string().min(4).max(128),
    connectorKind: z.enum(["client_mod", "server_plugin"]),
    connectorName: z.string().min(1).max(100),
    protocolVersion: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("auth.request"),
    connectorToken: z.string().min(32).max(512),
    connectorKind: z.enum(["client_mod", "server_plugin"]),
    protocolVersion: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("heartbeat"),
  }),
  z.object({
    type: z.literal("snapshot"),
    payload: z.object({
      position: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }),
      health: z.number().min(0).max(20),
      hunger: z.number().min(0).max(20),
      dimension: z.string().optional(),
      capturedAt: z.string().datetime(),
    }),
  }),
  z.object({
    type: z.literal("action.result"),
    actionId: z.string().uuid(),
    status: z.enum(["SUCCEEDED", "FAILED", "UNKNOWN"]),
    result: z.string().optional(),
    screenshotBase64: z.string().min(32).optional(),
  }),
]);

export type ConnectorMessage = z.infer<typeof connectorMessageSchema>;
