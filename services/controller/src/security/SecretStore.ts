import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type SecretKind = "auth_password" | "api_key";

export interface SecretMetadata {
  id: string;
  name: string;
  kind: SecretKind;
  createdAt: string;
  updatedAt: string;
}

interface SecretRecord extends SecretMetadata {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export class SecretStore {
  private readonly database: DatabaseSync;
  private readonly masterKey: Buffer;

  constructor(databasePath: string, masterKeyPath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.masterKey = loadOrCreateMasterKey(masterKeyPath);
    this.database = new DatabaseSync(databasePath);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  put(input: {
    name: string;
    kind: SecretKind;
    value: string;
  }): SecretMetadata {
    const id = randomUUID();
    const now = new Date().toISOString();
    const encrypted = encrypt(this.masterKey, input.value);

    this.database
      .prepare(`
        INSERT INTO secrets (
          id, name, kind, ciphertext, iv, auth_tag, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `)
      .run(
        id,
        input.name,
        input.kind,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        now,
        now,
      );

    return {
      id,
      name: input.name,
      kind: input.kind,
      createdAt: now,
      updatedAt: now,
    };
  }

  get(id: string): string | null {
    const row = this.database
      .prepare(`
        SELECT ciphertext, iv, auth_tag
        FROM secrets
        WHERE id = ?;
      `)
      .get(id) as {
        ciphertext: string;
        iv: string;
        auth_tag: string;
      } | undefined;

    if (!row) {
      return null;
    }

    try {
      return decrypt(this.masterKey, {
        ciphertext: row.ciphertext,
        iv: row.iv,
        authTag: row.auth_tag,
      });
    } catch {
      return null;
    }
  }

  getMetadata(id: string): SecretMetadata | null {
    return this.selectMetadata(id);
  }

  list(): SecretMetadata[] {
    const rows = this.database
      .prepare(`
        SELECT id, name, kind, created_at, updated_at
        FROM secrets
        ORDER BY created_at;
      `)
      .iterate() as IterableIterator<{
      id: string;
      name: string;
      kind: SecretKind;
      created_at: string;
      updated_at: string;
    }>;

    return [...rows].map(toMetadata);
  }

  delete(id: string): boolean {
    const result = this.database
      .prepare("DELETE FROM secrets WHERE id = ?;")
      .run(id);
    return result.changes > 0;
  }

  close(): void {
    this.database.close();
  }

  private selectMetadata(id: string): SecretMetadata | null {
    const row = this.database
      .prepare(`
        SELECT id, name, kind, created_at, updated_at
        FROM secrets
        WHERE id = ?;
      `)
      .get(id) as {
      id: string;
      name: string;
      kind: SecretKind;
      created_at: string;
      updated_at: string;
    } | undefined;

    return row ? toMetadata(row) : null;
  }
}

function loadOrCreateMasterKey(path: string): Buffer {
  const environmentKey = process.env.AICRAFT_SECRET_KEY;
  if (environmentKey) {
    const key = /^(?:[0-9a-f]{64})$/i.test(environmentKey)
      ? Buffer.from(environmentKey, "hex")
      : Buffer.from(environmentKey, "base64");

    if (key.length !== 32) {
      throw new Error("AICRAFT_SECRET_KEY must decode to 32 bytes");
    }
    return key;
  }

  try {
    const key = Buffer.from(readFileSync(path, "utf8").trim(), "base64");
    if (key.length === 32) {
      return key;
    }
  } catch {
    // A new key is created below.
  }

  const key = randomBytes(32);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${key.toString("base64")}\n`, { mode: 0o600 });
  return key;
}

function encrypt(
  masterKey: Buffer,
  value: string,
): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(
  masterKey: Buffer,
  input: {
    ciphertext: string;
    iv: string;
    authTag: string;
  },
): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    masterKey,
    Buffer.from(input.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function toMetadata(row: {
  id: string;
  name: string;
  kind: SecretKind;
  created_at: string;
  updated_at: string;
}): SecretMetadata {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
