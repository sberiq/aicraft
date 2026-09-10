package dev.aicraft.client;

import com.google.gson.JsonObject;
import net.minecraft.client.option.CloudRenderMode;
import net.minecraft.client.option.GameOptions;
import net.minecraft.client.option.GraphicsMode;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayNetworkHandler;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.util.ScreenshotRecorder;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

public final class AicraftActionExecutor {
    public JsonObject execute(JsonObject request) {
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

            if (player == null || networkHandler == null) {
                response.addProperty("status", "FAILED");
                response.addProperty("result", "Player or network handler is unavailable");
                return response;
            }

            if ("send_chat".equals(actionType)) {
                networkHandler.sendChatMessage(parameters.get("text").getAsString());
            } else if ("send_command".equals(actionType)) {
                String text = parameters.get("text").getAsString();
                networkHandler.sendChatCommand(text.startsWith("/") ? text.substring(1) : text);
            } else if ("set_movement".equals(actionType)) {
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
            } else {
                response.addProperty("status", "FAILED");
                response.addProperty("result", "Unsupported action type");
                return response;
            }

            if (!response.has("screenshotBase64")) {
                response.addProperty("status", "SUCCEEDED");
                response.addProperty("result", "Action sent through the Minecraft client");
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
