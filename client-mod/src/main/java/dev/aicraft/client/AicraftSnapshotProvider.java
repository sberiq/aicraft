package dev.aicraft.client;

import com.google.gson.JsonObject;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;

import java.time.Instant;

public final class AicraftSnapshotProvider {
    public JsonObject snapshot() {
        MinecraftClient client = MinecraftClient.getInstance();
        ClientPlayerEntity player = client.player;
        if (player == null) {
            return null;
        }

        JsonObject position = new JsonObject();
        position.addProperty("x", player.getX());
        position.addProperty("y", player.getY());
        position.addProperty("z", player.getZ());

        JsonObject payload = new JsonObject();
        payload.add("position", position);
        payload.addProperty("health", player.getHealth());
        payload.addProperty("hunger", player.getHungerManager().getFoodLevel());
        payload.addProperty("dimension", player.getWorld().getRegistryKey().getValue().toString());
        payload.addProperty("capturedAt", Instant.now().toString());
        return payload;
    }
}
