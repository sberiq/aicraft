# aicraft

Control plane and client integration for an autonomous Minecraft Java Edition agent.

The project is being built as a real Minecraft client body plus a separate agent brain:

- `client-mod/` - Fabric mod that runs inside the real Minecraft client.
- `server-plugin/` - optional integration plugin for trusted Minecraft servers.
- `services/controller/` - session, task, policy, connector, and brain control service.
- `apps/panel/` - web dashboard and onboarding experience.
- `infra/` - local deployment profiles for all-in-one and split topologies.
- `docs/` - requirements, contracts, configuration model, and acceptance scenarios.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

The controller and panel use Node.js 22 or newer. The flagship Minecraft 1.20.2 profile targets Java 17.

## Repository map

```text
client-mod/            Fabric client mod
server-plugin/         Optional server integration plugin
services/controller/   Agent control service
apps/panel/             Web dashboard
infra/                  Docker Compose and environment examples
docs/                  Contracts, schemas, onboarding, acceptance
```
