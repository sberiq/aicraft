import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { SecretStore } from "../src/security/SecretStore.js";

const directory = mkdtempSync(join(tmpdir(), "aicraft-secrets-"));

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("SecretStore", () => {
  it("encrypts values and returns only metadata", () => {
    const store = new SecretStore(
      join(directory, "secrets.sqlite"),
      join(directory, "master.key"),
    );
    const metadata = store.put({
      name: "AuthMe password",
      kind: "auth_password",
      value: "super-secret-password",
    });

    expect(metadata.name).toBe("AuthMe password");
    expect(metadata.kind).toBe("auth_password");
    expect(metadata.id).toBeTruthy();
    expect(store.get(metadata.id)).toBe("super-secret-password");

    const listed = store.list();
    expect(listed).toHaveLength(1);
    expect(JSON.stringify(listed[0])).not.toContain("super-secret-password");

    const rawDatabase = readFileSync(join(directory, "secrets.sqlite")).toString("utf8");
    expect(rawDatabase).not.toContain("super-secret-password");
    store.close();
  });

  it("deletes a secret", () => {
    const store = new SecretStore(
      join(directory, "delete-secrets.sqlite"),
      join(directory, "delete-master.key"),
    );
    const metadata = store.put({
      name: "API key",
      kind: "api_key",
      value: "test-api-key",
    });

    expect(store.delete(metadata.id)).toBe(true);
    expect(store.get(metadata.id)).toBeNull();
    expect(store.delete(metadata.id)).toBe(false);
    store.close();
  });
});
