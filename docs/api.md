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
