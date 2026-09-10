# Configuration Model

Configuration is stored by the controller and edited through the dashboard. The initial prototype keeps it in memory; persistence is added with the SQLite migration layer.

## Server Profile

- name, address, port, Minecraft version
- server rules and automation policy
- lobby procedure and plugin procedures
- trade limits and protected items
- authentication profile reference

## Client Profile

- Minecraft version, Fabric version, Java version
- client runner (`local`, `remote`)
- JVM options, memory limit, resolution
- render profile and default render mode
- enabled client mods and navigation provider

## Auth Profile

- `MICROSOFT`: account reference and Microsoft token secret
- `OFFLINE_SERVER`: configured nickname and optional server-login secret

Offline nicknames are not identity proofs for agent administration.

## Brain Profile

- mode: `BUILT_IN` or `EXTERNAL`
- model provider, model name, endpoint
- call budget, timeout, retry policy
- external transport and authentication

## Topology Profile

- `LOCAL`: local controller endpoint and client runner
- `REMOTE_CLIENT`: public WSS endpoint and paired client connector
- `REMOTE_PLUGIN`: optional paired server plugin

Every change is validated, versioned, audited, and reversible.
