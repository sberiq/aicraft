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
  loginCommandTemplate: z.string().min(1).max(120).optional(),
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

const movementSchema = z.object({
  forward: z.boolean(),
  back: z.boolean(),
  left: z.boolean(),
  right: z.boolean(),
  jump: z.boolean(),
  sneak: z.boolean(),
  sprint: z.boolean(),
});

export const requestActionSchema = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("send_chat"),
    parameters: z.object({
      text: z.string().min(1).max(256),
    }),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("send_command"),
    parameters: z.object({
      text: z.string().min(1).max(256),
    }),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("set_movement"),
    parameters: z.object({
      movement: movementSchema,
    }),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("set_render_mode"),
    parameters: z.object({
      mode: z.enum(["ECONOMY", "OBSERVE", "INTERACTIVE"]),
    }),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("capture_screenshot"),
    parameters: z.object({}),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("server_login"),
    parameters: z.object({
      secretId: z.string().uuid(),
    }),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("look"),
    parameters: z.object({
      yaw: z.number().min(-180).max(180),
      pitch: z.number().min(-90).max(90),
    }),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("select_hotbar"),
    parameters: z.object({
      slot: z.number().int().min(1).max(9),
    }),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("attack"),
    parameters: z.object({}),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("use_item"),
    parameters: z.object({}),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("open_inventory"),
    parameters: z.object({}),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("close_screen"),
    parameters: z.object({}),
    controlEpoch: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("drop_item"),
    parameters: z.object({}),
    controlEpoch: z.number().int().positive(),
  }),
]);

export const createSecretSchema = z.object({
  name: z.string().min(1).max(100),
  kind: z.enum(["auth_password", "api_key"]),
  value: z.string().min(1).max(4096),
});

export const serverLoginSchema = z.object({
  secretId: z.string().uuid(),
});
