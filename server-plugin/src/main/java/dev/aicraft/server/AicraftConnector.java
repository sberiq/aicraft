package dev.aicraft.server;

import org.bukkit.plugin.Plugin;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Duration;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

final class AicraftConnector {
    private final Plugin plugin;
    private final String endpoint;
    private final String token;
    private final String name;
    private final int heartbeatIntervalMs;
    private final boolean autoReconnect;
    private final AtomicReference<WebSocket> socket = new AtomicReference<>();
    private final AtomicBoolean connected = new AtomicBoolean(false);
    private final ScheduledExecutorService scheduler;

    AicraftConnector(
            Plugin plugin,
            String endpoint,
            String token,
            String name,
            int heartbeatIntervalMs,
            boolean autoReconnect
    ) {
        this.plugin = plugin;
        this.endpoint = endpoint;
        this.token = token;
        this.name = name;
        this.heartbeatIntervalMs = heartbeatIntervalMs;
        this.autoReconnect = autoReconnect;
        this.scheduler = Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, "aicraft-server-connector");
            thread.setDaemon(true);
            return thread;
        });
    }

    void start() {
        connect();
        scheduler.scheduleAtFixedRate(this::heartbeat, heartbeatIntervalMs, heartbeatIntervalMs, TimeUnit.MILLISECONDS);
    }

    void stop() {
        scheduler.shutdownNow();
        WebSocket current = socket.get();
        if (current != null) {
            current.sendClose(WebSocket.NORMAL_CLOSURE, "plugin disabled");
        }
        connected.set(false);
    }

    private void connect() {
        if (token.isBlank()) {
            plugin.getLogger().warning("connector-token is empty; pair this server in the aicraft dashboard");
            return;
        }

        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            WebSocket.Listener listener = new WebSocket.Listener() {
                @Override
                public void onOpen(WebSocket webSocket) {
                    connected.set(true);
                    webSocket.request(1);
                    JsonObject message = new JsonObject();
                    message.addProperty("type", "auth.request");
                    message.addProperty("connectorToken", token);
                    message.addProperty("connectorKind", "server_plugin");
                    message.addProperty("connectorName", name);
                    message.addProperty("protocolVersion", 1);
                    webSocket.sendText(message.toString(), true);
                }

                @Override
                public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                    webSocket.request(1);
                    return null;
                }

                @Override
                public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                    connected.set(false);
                    socket.set(null);
                    return null;
                }

                @Override
                public void onError(WebSocket webSocket, Throwable error) {
                    connected.set(false);
                    socket.set(null);
                    plugin.getLogger().warning("controller connection error");
                }
            };

            WebSocket webSocket = client.newWebSocketBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .buildAsync(URI.create(endpoint), listener)
                    .join();
            socket.set(webSocket);
        } catch (Exception exception) {
            connected.set(false);
            plugin.getLogger().warning("unable to connect controller");
        }
    }

    private void heartbeat() {
        WebSocket current = socket.get();
        if (current != null && connected.get()) {
            JsonObject message = new JsonObject();
            message.addProperty("type", "heartbeat");
            current.sendText(message.toString(), true);
        } else if (autoReconnect) {
            connect();
        }
    }

    private static final class JsonObject {
        private final StringBuilder json = new StringBuilder("{");

        void addProperty(String key, String value) {
            if (json.length() > 1) {
                json.append(',');
            }
            json.append('"').append(key).append("\":\"").append(value).append('"');
        }

        void addProperty(String key, int value) {
            if (json.length() > 1) {
                json.append(',');
            }
            json.append('"').append(key).append("\":").append(value);
        }

        @Override
        public String toString() {
            return json + "}";
        }
    }
}
