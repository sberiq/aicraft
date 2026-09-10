import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const sourcePath = resolve(process.argv[2] ?? "data/aicraft.sqlite");
const destinationPath = resolve(
  process.argv[3] ?? `data/backups/aicraft-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);

mkdirSync(dirname(destinationPath), { recursive: true });
const database = new DatabaseSync(sourcePath, { readOnly: true });
database.exec(`VACUUM INTO '${destinationPath.replace(/'/g, "''")}'`);
database.close();

console.log(destinationPath);
