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
