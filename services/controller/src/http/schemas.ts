import { z } from "zod";

export const startOnboardingSchema = z.object({
  displayName: z.string().min(1).max(80),
});

export const createPairingSchema = z.object({
  kind: z.enum(["client_mod", "server_plugin"]),
});

export const setTopologySchema = z.object({
  topology: z.enum(["LOCAL", "REMOTE_CLIENT"]),
});

export const clientProfileSchema = z.object({
  name: z.string().min(1).max(100),
  minecraftVersion: z.string().min(1).max(30),
  fabricVersion: z.string().min(1).max(100),
  javaVersion: z.string().min(1).max(30),
  runner: z.enum(["local", "remote"]),
});

export const serverProfileSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  minecraftVersion: z.string().min(1).max(30),
  authMode: z.enum(["MICROSOFT", "OFFLINE_SERVER"]),
  offlineNickname: z.string().min(1).max(32).optional(),
  clientProfileId: z.string().uuid(),
});

export const authProfileSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.enum(["MICROSOFT", "OFFLINE_SERVER"]),
  offlineNickname: z.string().min(1).max(32).optional(),
});

export const brainProfileSchema = z.object({
  mode: z.enum(["BUILT_IN", "EXTERNAL"]),
  endpoint: z.string().url().optional(),
  model: z.string().min(1).max(100).optional(),
  dailyCallLimit: z.number().int().min(0).max(1_000_000).optional(),
});

export const activeProfilesSchema = z.object({
  clientProfileId: z.string().uuid().optional(),
  serverProfileId: z.string().uuid().optional(),
  authProfileId: z.string().uuid().optional(),
  brainProfileId: z.string().uuid().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(120),
  goal: z.string().min(1).max(2000),
  priority: z.number().int().min(0).max(1000),
  author: z.string().min(1).max(80),
});

export const setControlOwnerSchema = z.object({
  owner: z.enum(["NONE", "AGENT", "HUMAN"]),
});

export const requestActionSchema = z.object({
  actionType: z.enum(["send_chat", "send_command"]),
  parameters: z.object({
    text: z.string().min(1).max(256),
  }),
  controlEpoch: z.number().int().positive(),
});
