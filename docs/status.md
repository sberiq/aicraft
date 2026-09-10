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
  - normal movement through Minecraft key bindings;
  - render modes `ECONOMY`, `OBSERVE`, and `INTERACTIVE`;
  - framebuffer screenshot capture as base64 PNG.
  - view direction control;
  - hotbar selection, attack, item use, inventory open/close, and item drop through normal client inputs.
  - GUI click and scroll actions through the currently open Minecraft screen.
  - inventory slot clicks through the normal client interaction manager.
  - client-side navigation toward X/Z through normal movement keys, yaw, tolerance, and timeout.
- Optional Paper server integration plugin builds successfully.
- Controller service provides:
  - health and status APIs;
  - onboarding state;
  - `LOCAL` / `REMOTE_CLIENT` topology switching;
  - connector pairing, tokens, heartbeat, and revocation;
  - client, server, identity, and brain profiles;
  - active profile switching;
  - task queue and cancellation;
  - external brain HTTP adapter with validated decisions;
  - deterministic built-in planner for chat, command, movement, render-mode, screenshot, look, hotbar, attack, item use, inventory, drop, navigation, navigation-cancel, GUI-click, GUI-scroll, and slot-click tasks;
  - `AGENT` / `HUMAN` control arbitration;
  - automatic movement-key and navigation release on manual takeover;
  - safe client actions for chat, commands, movement, render modes, and screenshots with `controlEpoch` checks;
  - SQLite persistence.
  - AES-256-GCM secret storage;
  - server login actions that never persist plaintext passwords;
  - persistent memory records for places, projects, promises, server procedures, and notes.
- Dashboard provides:
  - overview and live status polling;
  - Deployment topology switch;
  - Connections pairing and connector revocation;
  - Profiles for client, identity, server, and brain;
  - Control screen with manual takeover and task creation.
  - Client actions screen for chat, commands, movement, render modes, and screenshots.
  - Live screenshot display.
  - Secrets screen with metadata-only secret list and server login.
  - Memory screen for viewing, creating, editing, and deleting records.

## Verification

- Node tests: 76 passed.
- TypeScript typecheck: passed.
- Controller production build: passed.
- Panel production build: passed.
- Fabric mod Gradle build: passed.
- Paper plugin Maven build: passed.
- npm audit: 0 vulnerabilities.
- Live persistence check: task survived a controller restart.

## Next implementation milestone

1. Add higher-level mining and crafting skill compositions.
2. Add real Minecraft server connection smoke test.
3. Add long-run performance and deployment validation.
4. Add production deployment hardening and backup verification.
5. Add autonomous task scheduling and self-directed projects.
