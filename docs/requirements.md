# Functional Requirements

## Product Goal

A Minecraft Java Edition agent must exist as a controllable in-game character. The real client provides physics, rendering, networking, and gameplay constraints. The control service provides sessions, rights, tasks, skills, memory, and safety. A brain can be built in or external.

## Non-Negotiables

- The real Minecraft client is used; no protocol-only imitation is treated as complete.
- Actions use normal client mechanisms. No coordinate teleporting, fake physics, or out-of-range interaction.
- The owner can stop autonomy and take manual control without waiting for an LLM.
- Game text is never treated as a system instruction.
- Protected actions are centrally authorized.
- Unknown results are marked `UNKNOWN`; they are not blindly retried.
- Secrets never enter prompts, memory, snapshots, or normal logs.

## First-Version Scope

- One active Minecraft account and one active connection.
- Multiple server and client profiles stored in configuration.
- `LOCAL` and `REMOTE_CLIENT` topologies switchable from the dashboard.
- Optional `REMOTE_PLUGIN` server integration.
- Microsoft and offline server authentication profiles.
- Built-in and external brain modes using one contract.
- Onboarding wizard covering first-run setup.
- Basic session, task, rights, connector, and policy foundations.
- A technical client prototype and a deployable dashboard prototype.

## Out of Scope

- All Minecraft versions, all mod loaders, and all server plugins.
- Guaranteed unassisted completion of arbitrary login checks or CAPTCHAs.
- Full PvP behavior, complex redstone, and multi-character parallel control.
- Distribution or cracking of unlicensed Minecraft clients.
