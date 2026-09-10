# Controller API and Connector Protocol

## HTTP API

All HTTP responses use JSON. Runtime errors use:

```json
{
  "error": {
    "code": "STRING",
    "message": "Human-readable message"
  }
}
```

### Health

- `GET /api/health` - process readiness and version.
- `GET /api/status` - controller, active topology, session, and connection summary.

### Onboarding and configuration

- `GET /api/onboarding` - current step and completion state.
- `POST /api/onboarding/start` - create an owner profile and begin setup.
- `POST /api/onboarding/complete` - run readiness checks and finish setup.
- `GET /api/profiles` - server, client, auth, and brain profiles.
- `PATCH /api/profiles/:id` - update a profile.
- `POST /api/topology` - switch active topology.

### Connectors

- `POST /api/connectors/pair` - create a pairing grant.
- `GET /api/connectors` - connector registry and health.
- `DELETE /api/connectors/:id/token` - revoke a connector token.

### Secrets and server login

- `GET /api/secrets` - list secret metadata without values.
- `POST /api/secrets` - encrypt and store an auth password or API key.
- `DELETE /api/secrets/:id` - delete a secret.
- `POST /api/auth/login` - send a known server-login command to the paired client using a stored secret.

### Profiles

- `GET /api/profiles` - active profile IDs and profile catalogs.
- `POST /api/profiles/client` - create a client profile.
- `POST /api/profiles/server` - create a server profile.
- `POST /api/profiles/auth` - create a Microsoft or offline identity profile.
- `POST /api/profiles/brain` - create a built-in or external brain profile.
- `POST /api/profiles/active` - change active profiles.

### Tasks and control

- `GET /api/tasks` - list tasks in priority order.
- `POST /api/tasks` - create a task.
- `POST /api/tasks/:id/run` - run a task with the active brain.
- `POST /api/tasks/:id/cancel` - cancel a task.
- `POST /api/control` - set control owner to `NONE`, `AGENT`, or `HUMAN`.
- `GET /api/actions` - list client actions.
- `POST /api/actions` - request a safe client action with the current `controlEpoch`.

Supported client actions are `send_chat`, `send_command`, `set_movement`, `set_render_mode`, `capture_screenshot`, `look`, `select_hotbar`, `attack`, `use_item`, `open_inventory`, `close_screen`, and `drop_item`. Chat and commands use the real client network handler; movement, hotbar, attack, use, and drop use normal key bindings; render modes use Minecraft graphics options; and screenshots are captured from the client framebuffer.

## Connector WebSocket

Endpoint: `/connector`

A connector first sends:

```json
{
  "type": "pair.request",
  "pairingCode": "ONE_TIME_CODE",
  "connectorKind": "client_mod",
  "connectorName": "home-client",
  "protocolVersion": 1
}
``+

The controller replies with:

```json
{
  "type": "pair.accepted",
  "connectorId": "UUID",
  "connectorToken": "LONG_RANDOM_TOKEN",
  "heartbeatIntervalMs": 5000
}
```

Subsequent reconnects authenticate with `connectorToken`.

## Message Envelope

```json
{
  "id": "message-id",
  "type": "message.type",
  "sentAt": "ISO8601",
  "payload": {}
}
```

The controller rejects stale control messages using a monotonically increasing `controlEpoch`. Messages from a previous epoch are ignored.
