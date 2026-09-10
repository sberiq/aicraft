package dev.aicraft.client;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

public final class AicraftConnector {
    private static final Gson GSON = new Gson();

    private final AtomicReference<WebSocket> socket = new AtomicReference<>();
    private final AtomicBoolean connected = new AtomicBoolean(false);
    private final ScheduledExecutorService scheduler;
    private final AicraftConfig config;

    public AicraftConnector(AicraftConfig config) {
        this.config = config;
        this.scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "aicraft-connector");
            thread.setDaemon(true);
            return thread;
        });
    }

    public synchronized void start() {
        if (!config.enabled || config.endpoint.isBlank()) {
            AicraftClientMod.LOGGER.info("aicraft connector is disabled");
            return;
        }

        connect();
        scheduler.scheduleAtFixedRate(this::sendHeartbeat, config.heartbeatIntervalMs, config.heartbeatIntervalMs, TimeUnit.MILLISECONDS);
    }

    public synchronized void reconnect(String endpoint, String pairingCode) {
        config.endpoint = endpoint;
        config.pairingCode = pairingCode;
        config.connectorToken = "";
        AicraftConfig.save(config);
        disconnect();
        connect();
    }

    public boolean connected() {
        return connected.get();
    }

    private void connect() {
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            WebSocket.Listener listener = new WebSocket.Listener() {
                @Override
                public void onOpen(WebSocket webSocket) {
                    connected.set(true);
                    webSocket.request(1);
                    sendAuthentication(webSocket);
                }

                @Override
                public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                    handleText(data.toString());
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
                    AicraftClientMod.LOGGER.warn("aicraft connector error", error);
                }
            };

            WebSocket webSocket = client.newWebSocketBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .buildAsync(URI.create(config.endpoint), listener)
                    .join();
            socket.set(webSocket);
        } catch (Exception exception) {
            connected.set(false);
            AicraftClientMod.LOGGER.warn("Unable to connect aicraft controller", exception);
        }
    }

    private void sendAuthentication(WebSocket webSocket) {
        JsonObject message = new JsonObject();
        if (config.connectorToken.isBlank() && !config.pairingCode.isBlank()) {
            message.addProperty("type", "pair.request");
            message.addProperty("pairingCode", config.pairingCode);
            message.addProperty("connectorKind", "client_mod");
            message.addProperty("connectorName", config.connectorName);
            message.addProperty("protocolVersion", 1);
        } else if (!config.connectorToken.isBlank()) {
            message.addProperty("type", "auth.request");
            message.addProperty("connectorToken", config.connectorToken);
            message.addProperty("connectorKind", "client_mod");
            message.addProperty("protocolVersion", 1);
        } else {
            return;
        }

        send(webSocket, GSON.toJson(message));
    }

    private void handleText(String text) {
        JsonObject message = GSON.fromJson(text, JsonObject.class);
        String type = message.get("type").getAsString();

        if ("pair.accepted".equals(type)) {
            config.connectorToken = message.get("connectorToken").getAsString();
            AicraftConfig.save(config);
            AicraftClientMod.LOGGER.info("aicraft client paired with controller");
        } else if ("auth.accepted".equals(type)) {
            AicraftClientMod.LOGGER.info("aicraft client authenticated");
        }
    }

    private void sendHeartbeat() {
        WebSocket current = socket.get();
        if (current != null && connected.get()) {
            JsonObject heartbeat = new JsonObject();
            heartbeat.addProperty("type", "heartbeat");
            send(current, GSON.toJson(heartbeat));
        } else if (config.autoReconnect) {
            connect();
        }
    }

    private void send(WebSocket webSocket, String message) {
        webSocket.sendText(message, true);
    }

    private void disconnect() {
        WebSocket current = socket.get();
        if (current != null) {
            send(current, "{\"type\":\"disconnect\"}");
            current.sendClose(WebSocket.NORMAL_CLOSURE, "aicraft shutdown");
        }
        socket.set(null);
        connected.set(false);
    }
}
