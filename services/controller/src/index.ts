import { join } from "node:path";
import { SqliteControllerStateStore } from "./persistence/sqlite.js";
import { buildServer } from "./http/server.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

const databasePath = process.env.AICRAFT_DB_PATH ?? join(process.cwd(), "data", "aicraft.sqlite");
const store = new SqliteControllerStateStore(databasePath);
const app = await buildServer({ store });

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
