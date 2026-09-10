package dev.aicraft.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public final class AicraftConfig {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    public boolean enabled;
    public String endpoint;
    public String connectorName;
    public String pairingCode;
    public String connectorToken;
    public int heartbeatIntervalMs;
    public int snapshotIntervalMs;
    public boolean autoReconnect;

    private AicraftConfig() {
        this.enabled = false;
        this.endpoint = "ws://127.0.0.1:3000/connector";
        this.connectorName = "local-client";
        this.pairingCode = "";
        this.connectorToken = "";
        this.heartbeatIntervalMs = 5000;
        this.snapshotIntervalMs = 1000;
        this.autoReconnect = true;
    }

    public static AicraftConfig load() {
        Path path = configPath();
        if (Files.notExists(path)) {
            AicraftConfig config = new AicraftConfig();
            save(config);
            return config;
        }

        try {
            AicraftConfig config = GSON.fromJson(Files.readString(path, StandardCharsets.UTF_8), AicraftConfig.class);
            if (config == null) {
                return new AicraftConfig();
            }
            return config;
        } catch (IOException exception) {
            AicraftClientMod.LOGGER.error("Unable to read aicraft config, using defaults", exception);
            return new AicraftConfig();
        }
    }

    public static void save(AicraftConfig config) {
        try {
            Files.createDirectories(configPath().getParent());
            Files.writeString(configPath(), GSON.toJson(config), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            AicraftClientMod.LOGGER.error("Unable to save aicraft config", exception);
        }
    }

    private static Path configPath() {
        return FabricLoader.getInstance().getConfigDir().resolve("aicraft-client.json");
    }
}
