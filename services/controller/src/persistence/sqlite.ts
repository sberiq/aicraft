import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface ControllerStateStore {
  load(): unknown | null;
  save(data: unknown): void;
  close(): void;
}

export class SqliteControllerStateStore implements ControllerStateStore {
  private readonly database: DatabaseSync;

  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS controller_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  load(): unknown | null {
    const row = this.database
      .prepare("SELECT data FROM controller_state WHERE id = 1")
      .get() as { data: string } | undefined;

    if (!row) {
      return null;
    }

    return JSON.parse(row.data) as unknown;
  }

  save(data: unknown): void {
    const serialized = JSON.stringify(data);
    const updatedAt = new Date().toISOString();
    this.database
      .prepare(`
        INSERT INTO controller_state (id, data, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at;
      `)
      .run(serialized, updatedAt);
  }

  close(): void {
    this.database.close();
  }
}
