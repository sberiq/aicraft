# Current Implementation Status

## Working now

- Minecraft 1.20.2 flagship profile with Java 17 and Fabric.
- Fabric client mod builds successfully and provides:
  - configuration file;
  - `/aicraft connect <endpoint> <pairingCode>` command;
  - outbound controller connection;
  - pairing and long-term token storage;
  - heartbeat;
  - real in-game snapshots with position, health, hunger, dimension, and timestamp.
- Optional Paper server integration plugin builds successfully.
- Controller service provides:
  - health and status APIs;
  - onboarding state;
  - `LOCAL` / `REMOTE_CLIENT` topology switching;
  - connector pairing, tokens, heartbeat, and revocation;
  - client, server, identity, and brain profiles;
  - active profile switching;
  - task queue and cancellation;
  - deterministic built-in planner for `send chat` and `send command` tasks;
  - `AGENT` / `HUMAN` control arbitration;
  - safe client actions `send_chat` and `send_command` with `controlEpoch` checks;
  - SQLite persistence.
- Dashboard provides:
  - overview and live status polling;
  - Deployment topology switch;
  - Connections pairing and connector revocation;
  - Profiles for client, identity, server, and brain;
  - Control screen with manual takeover and task creation.
  - Client actions screen for chat and server commands.

## Verification

- Node tests: 48 passed.
- TypeScript typecheck: passed.
- Controller production build: passed.
- Panel production build: passed.
- Fabric mod Gradle build: passed.
- Paper plugin Maven build: passed.
- npm audit: 0 vulnerabilities.
- Live persistence check: task survived a controller restart.

## Next implementation milestone

1. Add built-in brain execution loop and skill contracts.
2. Add client action execution beyond snapshots.
3. Add render-mode control and screenshot capture.
4. Add real Minecraft server connection smoke test.
5. Add authentication secret storage and login handlers.
