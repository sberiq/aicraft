package dev.aicraft.client;

import com.google.gson.JsonObject;
import net.minecraft.client.option.CloudRenderMode;
import net.minecraft.client.option.GameOptions;
import net.minecraft.client.option.GraphicsMode;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.gui.screen.ingame.InventoryScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayNetworkHandler;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.screen.slot.SlotActionType;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public final class AicraftActionExecutor {
    private final AicraftNavigationController navigationController = new AicraftNavigationController();

    public JsonObject execute(JsonObject request) {
        String actionType = request.get("actionType").getAsString();
        if ("navigate_to".equals(actionType)) {
            return executeNavigation(request);
        }
        if ("cancel_navigation".equals(actionType)) {
            return executeCancelNavigation(request);
        }

        CompletableFuture<JsonObject> future = new CompletableFuture<>();
        MinecraftClient.getInstance().execute(() -> future.complete(executeOnClientThread(request)));
        return future.join();
    }

    private JsonObject executeOnClientThread(JsonObject request) {
        String actionId = request.get("actionId").getAsString();
        String actionType = request.get("actionType").getAsString();
        JsonObject parameters = request.getAsJsonObject("parameters");

        JsonObject response = new JsonObject();
        response.addProperty("type", "action.result");
        response.addProperty("actionId", actionId);

        try {
            MinecraftClient client = MinecraftClient.getInstance();
            ClientPlayerEntity player = client.player;
            ClientPlayNetworkHandler networkHandler = client.getNetworkHandler();

            if (player == null) {
                response.addProperty("status", "FAILED");
                response.addProperty("result", "Player is unavailable");
                return response;
            }

            if ("send_chat".equals(actionType)) {
                if (networkHandler == null) {
                    response.addProperty("status", "FAILED");
                    response.addProperty("result", "Network handler is unavailable");
                    return response;
                }
                networkHandler.sendChatMessage(parameters.get("text").getAsString());
            } else if ("send_command".equals(actionType)) {
                if (networkHandler == null) {
                    response.addProperty("status", "FAILED");
                    response.addProperty("result", "Network handler is unavailable");
                    return response;
                }
                String text = parameters.get("text").getAsString();
                networkHandler.sendChatCommand(text.startsWith("/") ? text.substring(1) : text);
            } else if ("set_movement".equals(actionType)) {
                navigationController.cancel();
                JsonObject movement = parameters.getAsJsonObject("movement");
                GameOptions options = client.options;
                options.forwardKey.setPressed(movement.get("forward").getAsBoolean());
                options.backKey.setPressed(movement.get("back").getAsBoolean());
                options.leftKey.setPressed(movement.get("left").getAsBoolean());
                options.rightKey.setPressed(movement.get("right").getAsBoolean());
                options.jumpKey.setPressed(movement.get("jump").getAsBoolean());
                options.sneakKey.setPressed(movement.get("sneak").getAsBoolean());
                options.sprintKey.setPressed(movement.get("sprint").getAsBoolean());
            } else if ("set_render_mode".equals(actionType)) {
                setRenderMode(client, parameters.get("mode").getAsString());
            } else if ("capture_screenshot".equals(actionType)) {
                NativeImage image = ScreenshotRecorder.takeScreenshot(client.getFramebuffer());
                Path temporaryFile = Files.createTempFile("aicraft-screenshot-", ".png");
                image.writeTo(temporaryFile);
                byte[] pngBytes = Files.readAllBytes(temporaryFile);
                image.close();
                Files.deleteIfExists(temporaryFile);
                response.addProperty("screenshotBase64", Base64.getEncoder().encodeToString(pngBytes));
            } else if ("look".equals(actionType)) {
                player.setYaw(parameters.get("yaw").getAsFloat());
                player.setPitch(parameters.get("pitch").getAsFloat());
            } else if ("select_hotbar".equals(actionType)) {
                int slot = parameters.get("slot").getAsInt() - 1;
                if (slot < 0 || slot >= client.options.hotbarKeys.length) {
                    response.addProperty("status", "FAILED");
                    response.addProperty("result", "Hotbar slot is out of range");
                    return response;
                }
                tapKey(client.options.hotbarKeys[slot]);
            } else if ("attack".equals(actionType)) {
                tapKey(client.options.attackKey);
            } else if ("use_item".equals(actionType)) {
                tapKey(client.options.useKey);
            } else if ("open_inventory".equals(actionType)) {
                client.setScreen(new InventoryScreen(player));
            } else if ("close_screen".equals(actionType)) {
                client.setScreen(null);
            } else if ("drop_item".equals(actionType)) {
                tapKey(client.options.dropKey);
            } else if ("screen_click".equals(actionType)) {
                if (client.currentScreen == null) {
                    response.addProperty("status", "FAILED");
                    response.addProperty("result", "No screen is open");
                    return response;
                }
                client.currentScreen.mouseClicked(
                        parameters.get("pointerX").getAsDouble(),
                        parameters.get("pointerY").getAsDouble(),
                        parameters.has("button") ? parameters.get("button").getAsInt() : 0
                );
            } else if ("screen_scroll".equals(actionType)) {
                if (client.currentScreen == null) {
                    response.addProperty("status", "FAILED");
                    response.addProperty("result", "No screen is open");
                    return response;
                }
                client.currentScreen.mouseScrolled(
                        parameters.get("pointerX").getAsDouble(),
                        parameters.get("pointerY").getAsDouble(),
                        0.0,
                        parameters.get("amount").getAsDouble()
                );
            } else if ("click_slot".equals(actionType)) {
                if (networkHandler == null) {
                    response.addProperty("status", "FAILED");
                    response.addProperty("result", "Network handler is unavailable");
                    return response;
                }

                String slotActionName = parameters.get("slotActionType").getAsString();
                SlotActionType slotActionType = switch (slotActionName) {
                    case "quick_move" -> SlotActionType.QUICK_MOVE;
                    case "swap" -> SlotActionType.SWAP;
                    case "throw" -> SlotActionType.THROW;
                    default -> SlotActionType.PICKUP;
                };

                client.interactionManager.clickSlot(
                        player.currentScreenHandler.syncId,
                        parameters.get("inventorySlot").getAsInt(),
                        parameters.has("button") ? parameters.get("button").getAsInt() : 0,
                        slotActionType,
                        player
                );
            } else {
                response.addProperty("status", "FAILED");
                response.addProperty("result", "Unsupported action type");
                return response;
            }

            if (!response.has("screenshotBase64")) {
                response.addProperty("status", "SUCCEEDED");
                response.addProperty("result", describeActionResult(actionType));
            } else {
                response.addProperty("status", "SUCCEEDED");
                response.addProperty("result", "Screenshot captured from Minecraft framebuffer");
            }
        } catch (Exception exception) {
            AicraftClientMod.LOGGER.warn("Unable to execute aicraft action", exception);
            response.addProperty("status", "FAILED");
            response.addProperty("result", "Minecraft client action failed");
        }

        return response;
    }

    private JsonObject executeNavigation(JsonObject request) {
        String actionId = request.get("actionId").getAsString();
        JsonObject parameters = request.getAsJsonObject("parameters");
        JsonObject response = new JsonObject();
        response.addProperty("type", "action.result");
        response.addProperty("actionId", actionId);

        try {
            double x = parameters.get("x").getAsDouble();
            double z = parameters.get("z").getAsDouble();
            double tolerance = parameters.has("tolerance") ? parameters.get("tolerance").getAsDouble() : 1.5;
            long timeout = parameters.has("timeoutMs") ? parameters.get("timeoutMs").getAsLong() : 120_000L;
            AicraftNavigationController.NavigationResult result = navigationController
                    .start(x, z, tolerance, timeout)
                    .join();

            response.addProperty("status", result.success() ? "SUCCEEDED" : "FAILED");
            response.addProperty("result", result.result());
        } catch (Exception exception) {
            AicraftClientMod.LOGGER.warn("Unable to navigate aicraft client", exception);
            response.addProperty("status", "FAILED");
            response.addProperty("result", "Navigation request failed");
        }

        return response;
    }

    private JsonObject executeCancelNavigation(JsonObject request) {
        String actionId = request.get("actionId").getAsString();
        navigationController.cancel();

        JsonObject response = new JsonObject();
        response.addProperty("type", "action.result");
        response.addProperty("actionId", actionId);
        response.addProperty("status", "SUCCEEDED");
        response.addProperty("result", "Navigation cancelled and movement keys released");
        return response;
    }

    public void releaseControl() {
        navigationController.cancel();
    }

    private void tapKey(KeyBinding keyBinding) {
        keyBinding.onKeyPressed(keyBinding.getDefaultKey());
        keyBinding.setPressed(true);
        CompletableFuture
                .delayedExecutor(50, TimeUnit.MILLISECONDS)
                .execute(() -> MinecraftClient.getInstance().execute(() -> keyBinding.setPressed(false)));
    }

    private String describeActionResult(String actionType) {
        return switch (actionType) {
            case "capture_screenshot" -> "Screenshot captured from Minecraft framebuffer";
            case "look" -> "Client view direction updated";
            case "select_hotbar" -> "Hotbar slot selected through normal key binding";
            case "attack" -> "Attack action sent through Minecraft client";
            case "use_item" -> "Item use action sent through Minecraft client";
            case "open_inventory" -> "Inventory screen opened";
            case "close_screen" -> "Client screen closed";
            case "drop_item" -> "Drop item key sent through normal key binding";
            case "screen_click" -> "Screen click processed by Minecraft GUI";
            case "screen_scroll" -> "Screen scroll processed by Minecraft GUI";
            case "click_slot" -> "Inventory slot click sent through Minecraft client";
            default -> "Action sent through the Minecraft client";
        };
    }

    private void setRenderMode(MinecraftClient client, String mode) {
        GameOptions options = client.options;

        switch (mode) {
            case "ECONOMY" -> {
                options.getMaxFps().setValue(10);
                options.getViewDistance().setValue(4);
                options.getEntityShadows().setValue(false);
                options.getCloudRenderMode().setValue(CloudRenderMode.OFF);
                options.getGraphicsMode().setValue(GraphicsMode.FAST);
            }
            case "OBSERVE" -> {
                options.getMaxFps().setValue(20);
                options.getViewDistance().setValue(8);
                options.getEntityShadows().setValue(false);
                options.getCloudRenderMode().setValue(CloudRenderMode.FAST);
                options.getGraphicsMode().setValue(GraphicsMode.FAST);
            }
            case "INTERACTIVE" -> {
                options.getMaxFps().setValue(60);
                options.getViewDistance().setValue(12);
                options.getEntityShadows().setValue(true);
                options.getCloudRenderMode().setValue(CloudRenderMode.FANCY);
                options.getGraphicsMode().setValue(GraphicsMode.FANCY);
            }
            default -> throw new IllegalArgumentException("Unsupported render mode: " + mode);
        }
    }
}
