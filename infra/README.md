# Deployment

The production profile runs the controller and dashboard in Docker:

```bash
docker compose -f infra/docker-compose.yml up --build
```

The controller stores state and encrypted secrets in the `controller-state` volume. Back up that volume regularly and keep `AICRAFT_SECRET_KEY` outside the database.

For split topology, run Minecraft with the Fabric mod on the local machine. Pair it from the dashboard `Connections` screen and point the mod at the controller's WSS endpoint.
