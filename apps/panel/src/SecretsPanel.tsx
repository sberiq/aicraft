import { KeyRound, LogIn, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { SecretKind, SecretMetadata } from "./types";

interface SecretsPanelProps {
  secrets: SecretMetadata[];
  onCreateSecret: (input: {
    name: string;
    kind: SecretKind;
    value: string;
  }) => Promise<void>;
  onDeleteSecret: (id: string) => Promise<void>;
  onServerLogin: (secretId: string) => Promise<void>;
}

export function SecretsPanel({
  secrets,
  onCreateSecret,
  onDeleteSecret,
  onServerLogin,
}: SecretsPanelProps) {
  const [form, setForm] = useState({
    name: "",
    kind: "auth_password" as SecretKind,
    value: "",
  });
  const authSecrets = useMemo(
    () => secrets.filter((secret) => secret.kind === "auth_password"),
    [secrets],
  );
  const [selectedSecretId, setSelectedSecretId] = useState("");
  const activeSecretId = selectedSecretId || authSecrets[0]?.id || "";

  const submit = () => {
    if (!form.name || !form.value) {
      return;
    }

    void onCreateSecret(form);
    setForm({ ...form, name: "", value: "" });
  };

  return (
    <div className="profile-layout">
      <section className="profile-section">
        <header>
          <KeyRound size={18} />
          <h2>Secrets</h2>
        </header>
        <div className="profile-form">
          <label className="field">
            <span>Name</span>
            <input
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              value={form.name}
            />
          </label>
          <label className="field">
            <span>Kind</span>
            <select
              onChange={(event) =>
                setForm({
                  ...form,
                  kind: event.target.value === "api_key" ? "api_key" : "auth_password",
                })
              }
              value={form.kind}
            >
              <option value="auth_password">auth_password</option>
              <option value="api_key">api_key</option>
            </select>
          </label>
          <label className="field">
            <span>Value</span>
            <input
              autoComplete="off"
              onChange={(event) => setForm({ ...form, value: event.target.value })}
              type="password"
              value={form.value}
            />
          </label>
          <button onClick={submit} type="button">
            <Save size={17} />
            Create
          </button>
        </div>
      </section>

      <section className="profile-section">
        <header>
          <LogIn size={18} />
          <h2>Server login</h2>
        </header>
        <div className="profile-form">
          <label className="field">
            <span>Secret</span>
            <select
              disabled={!authSecrets.length}
              onChange={(event) => setSelectedSecretId(event.target.value)}
              value={activeSecretId}
            >
              {authSecrets.map((secret) => (
                <option key={secret.id} value={secret.id}>
                  {secret.name}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!activeSecretId}
            onClick={() => void onServerLogin(activeSecretId)}
            type="button"
          >
            <LogIn size={17} />
            Login
          </button>
        </div>
        <p className="muted">
          The password is decrypted only when the command is sent to the paired client.
        </p>
      </section>

      <section className="profile-section wide-profile">
        <h2>Stored metadata</h2>
        {secrets.length ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {secrets.map((secret) => (
                <tr key={secret.id}>
                  <td>{secret.name}</td>
                  <td>{secret.kind}</td>
                  <td>{secret.updatedAt}</td>
                  <td>
                    <button
                      className="icon-button"
                      onClick={() => void onDeleteSecret(secret.id)}
                      title="Delete secret"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No secrets stored yet.</p>
        )}
      </section>
    </div>
  );
}
