# Acceptance Scenarios

## Connector and topology

1. Onboarding completes without manual config editing.
2. Client mod pairs through a one-time dashboard code.
3. Dashboard switches between `LOCAL` and `REMOTE_CLIENT`.
4. Revoking a connector token terminates that connector.
5. Connection loss cancels active actions and clears held input.

## Authentication

6. `MICROSOFT` profile starts a login flow.
7. `OFFLINE_SERVER` profile uses the configured nickname.
8. A forged offline nickname cannot gain agent administrator rights.

## Manual control

9. Owner can take control during an active skill.
10. Old brain commands are ignored after control epoch increases.
11. Owner can return control and the agent re-plans from a fresh snapshot.

## Governance

12. Only the owner can change rights, secrets, and topology.
13. New hard restrictions stop conflicting active tasks.
14. Chat and other game text cannot alter system instructions.
