# Connector Protocol

The connector protocol links a client mod or optional server plugin to the controller.

## Security

- Pairing codes are one-time, short-lived, and displayed in the dashboard.
- Long-term connector tokens are random and revocable.
- Remote connectors use WSS with certificate verification.
- Tokens are never written to normal logs or memory exports.
- Heartbeats detect stale connections.
- Revoked tokens immediately terminate the socket.

## Client Connector Settings

- controller endpoint
- pairing code or connector token
- TLS certificate verification
- autoconnect and reconnect policy
- heartbeat interval
- log level

## Server Plugin Connector Settings

- controller endpoint
- pairing code or connector token
- server identity
- event allowlist
- heartbeat interval

## Disconnect Behavior

On disconnect, controller:

1. marks the connector offline;
2. cancels active client actions;
3. clears held input;
4. records the failure;
5. follows the configured reconnect policy.

## Actions

The controller can send:

```json
{
  "type": "action.request",
  "actionId": "UUID",
  "actionType": "send_chat",
  "parameters": {
    "text": "Hello"
  },
  "controlEpoch": 3
}
```

The client replies with:

```json
{
  "type": "action.result",
  "actionId": "UUID",
  "status": "SUCCEEDED",
  "result": "Action sent through the Minecraft client"
}
```

Additional action types:

- `set_movement`: sets normal key-binding state for forward, back, left, right, jump, sneak, and sprint.
- `set_render_mode`: applies `ECONOMY`, `OBSERVE`, or `INTERACTIVE` graphics profiles.
- `capture_screenshot`: captures the framebuffer and returns base64 PNG data.
