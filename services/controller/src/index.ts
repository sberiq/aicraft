import { join } from "node:path";
import { SqliteControllerStateStore } from "./persistence/sqlite.js";
import { SecretStore } from "./security/SecretStore.js";
import { buildServer } from "./http/server.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

const databasePath = process.env.AICRAFT_DB_PATH ?? join(process.cwd(), "data", "aicraft.sqlite");
const store = new SqliteControllerStateStore(databasePath);
const secretDatabasePath =
  process.env.AICRAFT_SECRET_DB_PATH ?? join(process.cwd(), "data", "aicraft-secrets.sqlite");
const secretKeyPath =
  process.env.AICRAFT_SECRET_KEY_PATH ?? join(process.cwd(), "data", "aicraft-secret.key");
const secretStore = new SecretStore(secretDatabasePath, secretKeyPath);
const app = await buildServer({ store, secretStore });

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
