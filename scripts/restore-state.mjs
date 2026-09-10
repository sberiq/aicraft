import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const backupPath = resolve(process.argv[2]);
const destinationPath = resolve(process.argv[3] ?? "data/aicraft.sqlite");

mkdirSync(dirname(destinationPath), { recursive: true });
copyFileSync(backupPath, destinationPath);
console.log(destinationPath);
