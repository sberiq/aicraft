import { z } from "zod";

export const movementDecisionSchema = z.object({
  forward: z.boolean(),
  back: z.boolean(),
  left: z.boolean(),
  right: z.boolean(),
  jump: z.boolean(),
  sneak: z.boolean(),
  sprint: z.boolean(),
});

export const brainDecisionSchema = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("send_chat"),
    parameters: z.object({
      text: z.string().min(1).max(256),
    }),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("send_command"),
    parameters: z.object({
      text: z.string().min(1).max(256),
    }),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("set_movement"),
    parameters: z.object({
      movement: movementDecisionSchema,
    }),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("set_render_mode"),
    parameters: z.object({
      mode: z.enum(["ECONOMY", "OBSERVE", "INTERACTIVE"]),
    }),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("capture_screenshot"),
    parameters: z.object({}),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("look"),
    parameters: z.object({
      yaw: z.number().min(-180).max(180),
      pitch: z.number().min(-90).max(90),
    }),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("select_hotbar"),
    parameters: z.object({
      slot: z.number().int().min(1).max(9),
    }),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("attack"),
    parameters: z.object({}),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("use_item"),
    parameters: z.object({}),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("open_inventory"),
    parameters: z.object({}),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("close_screen"),
    parameters: z.object({}),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("drop_item"),
    parameters: z.object({}),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("navigate_to"),
    parameters: z.object({
      x: z.number().min(-30_000_000).max(30_000_000),
      z: z.number().min(-30_000_000).max(30_000_000),
      tolerance: z.number().min(0.5).max(64).default(1.5),
      timeoutMs: z.number().int().min(1000).max(600_000).default(120_000),
    }),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("cancel_navigation"),
    parameters: z.object({}),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("screen_click"),
    parameters: z.object({
      pointerX: z.number().min(0).max(8192),
      pointerY: z.number().min(0).max(4320),
      button: z.number().int().min(0).max(2).default(0),
    }),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("screen_scroll"),
    parameters: z.object({
      pointerX: z.number().min(0).max(8192),
      pointerY: z.number().min(0).max(4320),
      amount: z.number().min(-10).max(10),
    }),
    reasoning: z.string().max(2000).optional(),
  }),
  z.object({
    actionType: z.literal("click_slot"),
    parameters: z.object({
      inventorySlot: z.number().int().min(-999).max(999),
      button: z.number().int().min(0).max(2).default(0),
      slotActionType: z.enum(["pickup", "quick_move", "swap", "throw"]),
    }),
    reasoning: z.string().max(2000).optional(),
  }),
]);

export type BrainDecision = z.infer<typeof brainDecisionSchema>;
