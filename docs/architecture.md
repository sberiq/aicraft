# Architecture

## Components

```text
Brain: Built-in or External
  |
  | Brain contract
Controller
  - profiles, onboarding, policies, sessions, tasks
  - connector registry, pairing, tokens
  |
  | WS/WSS
Fabric client mod
  - snapshots, client actions, render modes
  |
Optional server plugin
  - events, identity, procedures
```

The controller is independent of Minecraft. It remains available when the client is stopped and can accept tasks, configuration changes, and dashboard commands.

## Process Boundaries

- **Brain** produces intentions and reports. It never directly edits Minecraft state.
- **Controller** owns authorization, task state, connector identity, configuration, and memory.
- **Client mod** observes, executes ordinary client actions, and reports results.
- **Server plugin** is optional and only extends trusted server information. It cannot grant rights.
- **Dashboard** is an operator surface, not a source of truth.

## Topologies

### `LOCAL`

Controller, dashboard, and Minecraft run on one host. The mod connects through a local WebSocket or Unix socket.

### `REMOTE_CLIENT`

Minecraft runs on a user machine. Controller and brain run on a VPS. The mod initiates outbound WSS to the controller, so no home firewall ports need to be opened.

### `REMOTE_PLUGIN`

A trusted server plugin connects to the controller using the same connector model. It provides additional server events or identity signals and has no implicit rights over the agent.

## State Ownership

- Connector identity and tokens: controller.
- Minecraft observation: client mod.
- Task and policy state: controller.
- Long-term personality and project memory: selected brain mode or controller memory service.
- Secrets: controller secret storage only.

## Failure Rules

- Loss of dashboard connection clears manual input.
- Loss of client connector cancels active skills and clears held input.
- LLM failure does not block owner commands or manual control.
- Unknown operation results are recorded and require verification before retry.
