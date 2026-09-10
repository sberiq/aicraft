package dev.aicraft.client;

import com.google.gson.JsonObject;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayNetworkHandler;
import net.minecraft.client.network.ClientPlayerEntity;

public final class AicraftActionExecutor {
    public JsonObject execute(JsonObject request) {
        String actionId = request.get("actionId").getAsString();
        String actionType = request.get("actionType").getAsString();
        JsonObject parameters = request.getAsJsonObject("parameters");
        String text = parameters.get("text").getAsString();

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
                networkHandler.sendChatMessage(text);
            } else if ("send_command".equals(actionType)) {
                networkHandler.sendChatCommand(text.startsWith("/") ? text.substring(1) : text);
            } else {
                response.addProperty("status", "FAILED");
                response.addProperty("result", "Unsupported action type");
                return response;
            }

            response.addProperty("status", "SUCCEEDED");
            response.addProperty("result", "Action sent through the Minecraft client");
        } catch (Exception exception) {
            AicraftClientMod.LOGGER.warn("Unable to execute aicraft action", exception);
            response.addProperty("status", "FAILED");
            response.addProperty("result", "Minecraft client action failed");
        }

        return response;
    }
}
