package dev.aicraft.server;

import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

public final class AicraftPlugin extends JavaPlugin {
    private final AtomicReference<WebSocket> socket = new AtomicReference<>();
    private AicraftConnector connector;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        FileConfiguration config = getConfig();

        if (!config.getBoolean("enabled", false)) {
            getLogger().info("aicraft integration is disabled");
            return;
        }

        String endpoint = config.getString("connector-endpoint", "");
        String token = config.getString("connector-token", "");
        String name = config.getString("connector-name", "minecraft-server");
        int heartbeat = config.getInt("heartbeat-interval-ms", 5000);
        boolean reconnect = config.getBoolean("auto-reconnect", true);

        if (endpoint.isBlank()) {
            getLogger().warning("connector-endpoint is empty");
            return;
        }

        connector = new AicraftConnector(this, endpoint, token, name, heartbeat, reconnect);
        connector.start();
    }

    @Override
    public void onDisable() {
        if (connector != null) {
            connector.stop();
        }
    }
}
