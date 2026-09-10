import {
  Bot,
  CircleCheck,
  House,
  KeyRound,
  Save,
  Server,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Profiles, SecretMetadata } from "./types";

interface ProfilesPanelProps {
  profiles: Profiles | null;
  secrets: SecretMetadata[];
  onCreateClient: (input: {
    name: string;
    minecraftVersion: string;
    fabricVersion: string;
    javaVersion: string;
    runner: "local" | "remote";
  }) => Promise<void>;
  onCreateAuth: (input: {
    name: string;
    mode: "MICROSOFT" | "OFFLINE_SERVER";
    offlineNickname?: string | undefined;
  }) => Promise<void>;
  onCreateServer: (input: {
    name: string;
    address: string;
    port: number;
    minecraftVersion: string;
    authMode: "MICROSOFT" | "OFFLINE_SERVER";
    offlineNickname?: string | undefined;
    loginCommandTemplate?: string | undefined;
    clientProfileId: string;
  }) => Promise<void>;
  onCreateBrain: (input: {
    mode: "BUILT_IN" | "EXTERNAL";
    endpoint?: string | undefined;
    tokenSecretId?: string | undefined;
    model?: string | undefined;
    dailyCallLimit?: number | undefined;
  }) => Promise<void>;
  onActivate: (input: Partial<Profiles["active"]>) => Promise<void>;
}

interface ServerForm {
  name: string;
  address: string;
  port: number;
  minecraftVersion: string;
  authMode: "MICROSOFT" | "OFFLINE_SERVER";
  offlineNickname: string;
  loginCommandTemplate: string;
}

export function ProfilesPanel({
  profiles,
  secrets,
  onCreateClient,
  onCreateAuth,
  onCreateServer,
  onCreateBrain,
  onActivate,
}: ProfilesPanelProps) {
  const activeClientId = profiles?.active.clientProfileId ?? "";
  const [clientForm, setClientForm] = useState({
    name: "Minecraft 1.20.2",
    minecraftVersion: "1.20.2",
    fabricVersion: "0.91.6+1.20.2",
    javaVersion: "17",
    runner: "local" as "local" | "remote",
  });
  const [authForm, setAuthForm] = useState({
    name: "Offline player",
    mode: "OFFLINE_SERVER" as "MICROSOFT" | "OFFLINE_SERVER",
    offlineNickname: "AiCraft",
  });
  const [serverForm, setServerForm] = useState<ServerForm>({
    name: "Local server",
    address: "127.0.0.1",
    port: 25565,
    minecraftVersion: "1.20.2",
    authMode: "OFFLINE_SERVER" as "MICROSOFT" | "OFFLINE_SERVER",
    offlineNickname: "AiCraft",
    loginCommandTemplate: "/login {secret}",
  });
  const [brainForm, setBrainForm] = useState({
    mode: "BUILT_IN" as "BUILT_IN" | "EXTERNAL",
    endpoint: "",
    tokenSecretId: "",
    model: "gpt-5-mini",
    dailyCallLimit: "500",
  });

  const activeServerClientId = useMemo(() => {
    const server = profiles?.serverProfiles.find(
      (profile) => profile.id === profiles.active.serverProfileId,
    );
    return server?.clientProfileId ?? "";
  }, [profiles]);

  const createClient = () => {
    void onCreateClient(clientForm);
  };

  const createAuth = () => {
    void onCreateAuth({
      ...authForm,
      offlineNickname:
        authForm.mode === "OFFLINE_SERVER" ? authForm.offlineNickname : undefined,
    });
  };

  const createServer = () => {
    if (!activeClientId) return;
    void onCreateServer({
      ...serverForm,
      clientProfileId: activeClientId,
      offlineNickname:
        serverForm.authMode === "OFFLINE_SERVER" ? serverForm.offlineNickname : undefined,
      loginCommandTemplate: serverForm.loginCommandTemplate || undefined,
    });
  };

  const createBrain = () => {
    const dailyCallLimit = Number(brainForm.dailyCallLimit);
    void onCreateBrain({
      mode: brainForm.mode,
      endpoint: brainForm.mode === "EXTERNAL" ? brainForm.endpoint : undefined,
      tokenSecretId:
        brainForm.mode === "EXTERNAL" && brainForm.tokenSecretId
          ? brainForm.tokenSecretId
          : undefined,
      model: brainForm.mode === "BUILT_IN" ? brainForm.model : undefined,
      dailyCallLimit: Number.isFinite(dailyCallLimit) ? dailyCallLimit : undefined,
    });
  };

  return (
    <div className="profile-layout">
      <section className="profile-section">
        <header>
          <House size={18} />
          <h2>Client profiles</h2>
        </header>
        <div className="profile-form">
          <Field label="Name">
            <input
              onChange={(event) => setClientForm({ ...clientForm, name: event.target.value })}
              value={clientForm.name}
            />
          </Field>
          <Field label="Minecraft">
            <input
              onChange={(event) =>
                setClientForm({ ...clientForm, minecraftVersion: event.target.value })
              }
              value={clientForm.minecraftVersion}
            />
          </Field>
          <Field label="Fabric">
            <input
              onChange={(event) =>
                setClientForm({ ...clientForm, fabricVersion: event.target.value })
              }
              value={clientForm.fabricVersion}
            />
          </Field>
          <Field label="Java">
            <input
              onChange={(event) => setClientForm({ ...clientForm, javaVersion: event.target.value })}
              value={clientForm.javaVersion}
            />
          </Field>
          <Field label="Runner">
            <select
              onChange={(event) =>
                setClientForm({
                  ...clientForm,
                  runner: event.target.value === "remote" ? "remote" : "local",
                })
              }
              value={clientForm.runner}
            >
              <option value="local">local</option>
              <option value="remote">remote</option>
            </select>
          </Field>
          <button onClick={createClient} type="button">
            <Save size={17} />
            Create
          </button>
        </div>
        <ProfileRows
          activeId={profiles?.active.clientProfileId ?? null}
          onActivate={(id) => void onActivate({ clientProfileId: id })}
          rows={(profiles?.clientProfiles ?? []).map((profile) => ({
            id: profile.id,
            title: profile.name,
            details: `${profile.minecraftVersion} · Fabric ${profile.fabricVersion} · Java ${profile.javaVersion} · ${profile.runner}`,
          }))}
        />
      </section>

      <section className="profile-section">
        <header>
          <KeyRound size={18} />
          <h2>Identity</h2>
        </header>
        <div className="profile-form">
          <Field label="Name">
            <input
              onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
              value={authForm.name}
            />
          </Field>
          <Field label="Mode">
            <select
              onChange={(event) =>
                setAuthForm({
                  ...authForm,
                  mode: event.target.value === "MICROSOFT" ? "MICROSOFT" : "OFFLINE_SERVER",
                })
              }
              value={authForm.mode}
            >
              <option value="MICROSOFT">MICROSOFT</option>
              <option value="OFFLINE_SERVER">OFFLINE_SERVER</option>
            </select>
          </Field>
          <Field label="Nickname">
            <input
              disabled={authForm.mode !== "OFFLINE_SERVER"}
              onChange={(event) =>
                setAuthForm({ ...authForm, offlineNickname: event.target.value })
              }
              value={authForm.offlineNickname}
            />
          </Field>
          <button onClick={createAuth} type="button">
            <Save size={17} />
            Create
          </button>
        </div>
        <ProfileRows
          activeId={profiles?.active.authProfileId ?? null}
          onActivate={(id) => void onActivate({ authProfileId: id })}
          rows={(profiles?.authProfiles ?? []).map((profile) => ({
            id: profile.id,
            title: profile.name,
            details: profile.mode === "OFFLINE_SERVER"
              ? `OFFLINE_SERVER · ${profile.offlineNickname ?? "no nickname"}`
              : "MICROSOFT",
          }))}
        />
      </section>

      <section className="profile-section">
        <header>
          <Server size={18} />
          <h2>Servers</h2>
        </header>
        <div className="profile-form">
          <Field label="Name">
            <input
              onChange={(event) => setServerForm({ ...serverForm, name: event.target.value })}
              value={serverForm.name}
            />
          </Field>
          <Field label="Address">
            <input
              onChange={(event) => setServerForm({ ...serverForm, address: event.target.value })}
              value={serverForm.address}
            />
          </Field>
          <Field label="Port">
            <input
              min={1}
              max={65535}
              onChange={(event) =>
                setServerForm({ ...serverForm, port: Number(event.target.value) || 0 })
              }
              type="number"
              value={serverForm.port}
            />
          </Field>
          <Field label="Minecraft">
            <input
              onChange={(event) =>
                setServerForm({ ...serverForm, minecraftVersion: event.target.value })
              }
              value={serverForm.minecraftVersion}
            />
          </Field>
          <Field label="Auth">
            <select
              onChange={(event) =>
                setServerForm({
                  ...serverForm,
                  authMode: event.target.value === "MICROSOFT" ? "MICROSOFT" : "OFFLINE_SERVER",
                })
              }
              value={serverForm.authMode}
            >
              <option value="MICROSOFT">MICROSOFT</option>
              <option value="OFFLINE_SERVER">OFFLINE_SERVER</option>
            </select>
          </Field>
          <Field label="Nickname">
            <input
              disabled={serverForm.authMode !== "OFFLINE_SERVER"}
              onChange={(event) =>
                setServerForm({ ...serverForm, offlineNickname: event.target.value })
              }
              value={serverForm.offlineNickname}
            />
          </Field>
          <Field label="Login command">
            <input
              onChange={(event) =>
                setServerForm({ ...serverForm, loginCommandTemplate: event.target.value })
              }
              value={serverForm.loginCommandTemplate}
            />
          </Field>
          <button onClick={createServer} type="button">
            <Save size={17} />
            Create
          </button>
        </div>
        <ProfileRows
          activeId={profiles?.active.serverProfileId ?? null}
          onActivate={(id) => void onActivate({ serverProfileId: id })}
          rows={(profiles?.serverProfiles ?? []).map((profile) => ({
            id: profile.id,
            title: profile.name,
            details: `${profile.address}:${profile.port} · ${profile.minecraftVersion} · ${profile.authMode}${profile.clientProfileId === activeServerClientId ? " · active client" : ""}`,
          }))}
        />
      </section>

      <section className="profile-section">
        <header>
          <Bot size={18} />
          <h2>Brain</h2>
        </header>
        <div className="profile-form">
          <Field label="Mode">
            <select
              onChange={(event) =>
                setBrainForm({
                  ...brainForm,
                  mode: event.target.value === "EXTERNAL" ? "EXTERNAL" : "BUILT_IN",
                })
              }
              value={brainForm.mode}
            >
              <option value="BUILT_IN">BUILT_IN</option>
              <option value="EXTERNAL">EXTERNAL</option>
            </select>
          </Field>
          <Field label="Model">
            <input
              disabled={brainForm.mode !== "BUILT_IN"}
              onChange={(event) => setBrainForm({ ...brainForm, model: event.target.value })}
              value={brainForm.model}
            />
          </Field>
          <Field label="Endpoint">
            <input
              disabled={brainForm.mode !== "EXTERNAL"}
              onChange={(event) => setBrainForm({ ...brainForm, endpoint: event.target.value })}
              placeholder="https://agent.example.com"
              value={brainForm.endpoint}
            />
          </Field>
          <Field label="Token secret">
            <select
              disabled={brainForm.mode !== "EXTERNAL"}
              onChange={(event) =>
                setBrainForm({ ...brainForm, tokenSecretId: event.target.value })
              }
              value={brainForm.tokenSecretId}
            >
              <option value="">none</option>
              {secrets
                .filter((secret) => secret.kind === "api_key")
                .map((secret) => (
                  <option key={secret.id} value={secret.id}>
                    {secret.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Daily limit">
            <input
              min={0}
              onChange={(event) => setBrainForm({ ...brainForm, dailyCallLimit: event.target.value })}
              type="number"
              value={brainForm.dailyCallLimit}
            />
          </Field>
          <button onClick={createBrain} type="button">
            <Save size={17} />
            Create
          </button>
        </div>
        <ProfileRows
          activeId={profiles?.active.brainProfileId ?? null}
          onActivate={(id) => void onActivate({ brainProfileId: id })}
          rows={(profiles?.brainProfiles ?? []).map((profile) => ({
            id: profile.id,
            title: profile.mode,
            details: profile.mode === "BUILT_IN"
              ? `${profile.model ?? "default model"} · ${profile.dailyCallLimit ?? 0} calls`
              : (profile.endpoint ?? "external endpoint"),
          }))}
        />
      </section>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ProfileRows({
  activeId,
  onActivate,
  rows,
}: {
  activeId: string | null;
  onActivate: (id: string) => void;
  rows: Array<{ id: string; title: string; details: string }>;
}) {
  if (!rows.length) {
    return <p className="muted">No profiles yet.</p>;
  }

  return (
    <div className="profile-list">
      {rows.map((row) => (
        <button
          className={activeId === row.id ? "profile-row active" : "profile-row"}
          key={row.id}
          onClick={() => onActivate(row.id)}
          type="button"
        >
          {activeId === row.id ? <CircleCheck size={17} /> : <UserRound size={17} />}
          <span>
            <strong>{row.title}</strong>
            <small>{row.details}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
