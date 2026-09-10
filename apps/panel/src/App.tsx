import {
  Activity,
  Bot,
  CheckCircle2,
  ClipboardList,
  Copy,
  House,
  KeyRound,
  Network,
  Notebook,
  Plug,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { ProfilesPanel } from "./ProfilesPanel";
import { ControlPanel } from "./ControlPanel";
import { SecretsPanel } from "./SecretsPanel";
import { MemoryPanel } from "./MemoryPanel";
import type { ConnectorKind, Status } from "./types";

type TabId =
  | "overview"
  | "deployment"
  | "connections"
  | "profiles"
  | "secrets"
  | "memory"
  | "control"
  | "onboarding";

const tabs: Array<{ id: TabId; label: string; icon: typeof House }> = [
  { id: "overview", label: "Обзор", icon: Activity },
  { id: "deployment", label: "Deployment", icon: Server },
  { id: "connections", label: "Connections", icon: Network },
  { id: "profiles", label: "Profiles", icon: SlidersHorizontal },
  { id: "secrets", label: "Secrets", icon: KeyRound },
  { id: "memory", label: "Memory", icon: Notebook },
  { id: "control", label: "Control", icon: ClipboardList },
  { id: "onboarding", label: "Onboarding", icon: Rocket },
];

export function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [pairing, setPairing] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setStatus(await api.status());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Controller unavailable");
    }
  };

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5_000);
    return () => clearInterval(timer);
  }, []);

  const topology = status?.settings.activeTopology ?? "LOCAL";
  const onlineConnectors = useMemo(
    () => status?.connectors.filter((connector) => connector.status === "online").length ?? 0,
    [status],
  );

  const run = async (action: string, task: () => Promise<void>) => {
    setBusyAction(action);
    try {
      await task();
      await refresh();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed");
    } finally {
      setBusyAction(null);
    }
  };

  const switchTopology = async (next: Status["settings"]["activeTopology"]) => {
    if (next === topology) return;
    await run("topology", async () => {
      await api.setTopology(next);
    });
  };

  const createPairing = async (kind: ConnectorKind) => {
    await run(`pair-${kind}`, async () => {
      const grant = await api.createPairing(kind);
      setPairing(grant.code);
    });
  };

  const createClientProfile = async (input: Parameters<typeof api.createClientProfile>[0]) => {
    await run("create-client-profile", async () => {
      await api.createClientProfile(input);
    });
  };

  const createAuthProfile = async (input: Parameters<typeof api.createAuthProfile>[0]) => {
    await run("create-auth-profile", async () => {
      await api.createAuthProfile(input);
    });
  };

  const createServerProfile = async (input: Parameters<typeof api.createServerProfile>[0]) => {
    await run("create-server-profile", async () => {
      await api.createServerProfile(input);
    });
  };

  const createBrainProfile = async (input: Parameters<typeof api.createBrainProfile>[0]) => {
    await run("create-brain-profile", async () => {
      await api.createBrainProfile(input);
    });
  };

  const activateProfiles = async (input: Parameters<typeof api.setActiveProfiles>[0]) => {
    await run("activate-profiles", async () => {
      await api.setActiveProfiles(input);
    });
  };

  const createTask = async (input: Parameters<typeof api.createTask>[0]) => {
    await run("create-task", async () => {
      await api.createTask(input);
    });
  };

  const cancelTask = async (id: string) => {
    await run(`cancel-task-${id}`, async () => {
      await api.cancelTask(id);
    });
  };

  const runTask = async (id: string) => {
    await run(`run-task-${id}`, async () => {
      await api.runTask(id);
    });
  };

  const setControlOwner = async (owner: Status["controlOwner"]) => {
    await run("set-control-owner", async () => {
      await api.setControlOwner(owner);
    });
  };

  const requestAction = async (input: Parameters<typeof api.requestAction>[0]) => {
    await run("request-action", async () => {
      await api.requestAction(input);
    });
  };

  const createSecret = async (input: Parameters<typeof api.createSecret>[0]) => {
    await run("create-secret", async () => {
      await api.createSecret(input);
    });
  };

  const deleteSecret = async (id: string) => {
    await run(`delete-secret-${id}`, async () => {
      await api.deleteSecret(id);
    });
  };

  const serverLogin = async (secretId: string) => {
    await run(`server-login-${secretId}`, async () => {
      await api.serverLogin(secretId);
    });
  };

  const createMemory = async (input: Parameters<typeof api.createMemory>[0]) => {
    await run("create-memory", async () => {
      await api.createMemory(input);
    });
  };

  const updateMemory = async (
    id: string,
    input: Parameters<typeof api.updateMemory>[1],
  ) => {
    await run(`update-memory-${id}`, async () => {
      await api.updateMemory(id, input);
    });
  };

  const deleteMemory = async (id: string) => {
    await run(`delete-memory-${id}`, async () => {
      await api.deleteMemory(id);
    });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="brand-line">
            <Bot size={24} aria-hidden />
            <h1>aicraft</h1>
          </div>
          <p className="muted">Minecraft agent control plane</p>
        </div>
        <div className="header-actions">
          <span className={`status-pill ${error ? "error" : "ok"}`}>
            {error ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            {error ? "Offline" : "Online"}
          </span>
          <button
            className="icon-button"
            onClick={() => void refresh()}
            title="Refresh status"
            type="button"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <nav className="tab-bar" aria-label="Dashboard sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={activeTab === tab.id ? "tab active" : "tab"}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}

      <main>
        {activeTab === "overview" ? (
          <section className="panel-grid" aria-label="Overview">
            <MetricCard
              icon={<Server size={18} />}
              label="Topology"
              value={topology}
            />
            <MetricCard icon={<Network size={18} />} label="Connectors online" value={onlineConnectors} />
            <MetricCard icon={<ShieldCheck size={18} />} label="Control epoch" value={status?.controlEpoch ?? 0} />
            <MetricCard
              icon={<Activity size={18} />}
              label="Snapshot"
              value={status?.snapshot ? "Live" : "Waiting"}
            />
            <section className="wide-card">
              <h2>Session</h2>
              {status?.snapshot ? (
                <dl className="facts">
                  <div>
                    <dt>Position</dt>
                    <dd>
                      {status.snapshot.position.x.toFixed(1)} / {status.snapshot.position.y.toFixed(1)} /{" "}
                      {status.snapshot.position.z.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt>Health</dt>
                    <dd>{status.snapshot.health}</dd>
                  </div>
                  <div>
                    <dt>Hunger</dt>
                    <dd>{status.snapshot.hunger}</dd>
                  </div>
                </dl>
              ) : (
                <p className="muted">Client snapshot has not arrived yet.</p>
              )}
            </section>
          </section>
        ) : null}

        {activeTab === "deployment" ? (
          <section className="panel-grid" aria-label="Deployment topology">
            <section className="wide-card">
              <h2>Topology</h2>
              <div className="segmented">
                <button
                  className={topology === "LOCAL" ? "selected" : ""}
                  onClick={() => void switchTopology("LOCAL")}
                  type="button"
                >
                  <House size={17} />
                  LOCAL
                </button>
                <button
                  className={topology === "REMOTE_CLIENT" ? "selected" : ""}
                  onClick={() => void switchTopology("REMOTE_CLIENT")}
                  type="button"
                >
                  <Network size={17} />
                  REMOTE_CLIENT
                </button>
              </div>
              <p className="muted">
                {topology === "LOCAL"
                  ? "Controller, dashboard, and client run on one host."
                  : "Client runs locally and connects outbound to the controller on the VPS."}
              </p>
            </section>
          </section>
        ) : null}

        {activeTab === "connections" ? (
          <section className="panel-grid" aria-label="Connections">
            <section className="wide-card">
              <h2>Connectors</h2>
              <div className="toolbar">
                <button
                  disabled={busyAction === "pair-client_mod"}
                  onClick={() => void createPairing("client_mod")}
                  type="button"
                >
                  <Plug size={17} />
                  Client pairing
                </button>
                <button
                  disabled={busyAction === "pair-server_plugin"}
                  onClick={() => void createPairing("server_plugin")}
                  type="button"
                >
                  <Server size={17} />
                  Plugin pairing
                </button>
              </div>
              {pairing ? (
                <div className="pairing-box">
                  <span>{pairing}</span>
                  <button
                    className="icon-button"
                    onClick={() => void navigator.clipboard.writeText(pairing)}
                    title="Copy pairing code"
                    type="button"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              ) : null}
              {status?.connectors.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Kind</th>
                      <th>Status</th>
                      <th>Last seen</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.connectors.map((connector) => (
                      <tr key={connector.id}>
                        <td>{connector.name}</td>
                        <td>{connector.kind}</td>
                        <td>
                          <span className={`status-pill ${connector.status}`}>
                            {connector.status}
                          </span>
                        </td>
                        <td>{connector.lastSeenAt ?? "never"}</td>
                        <td>
                          <button
                            disabled={connector.status === "revoked"}
                            onClick={() =>
                              void run(`revoke-${connector.id}`, async () => {
                                await api.revokeConnector(connector.id);
                              })
                            }
                            type="button"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No paired connectors yet.</p>
              )}
            </section>
          </section>
        ) : null}

        {activeTab === "onboarding" ? (
          <section className="panel-grid" aria-label="Onboarding">
            <section className="wide-card">
              <h2>Onboarding</h2>
              {status?.onboarding.status === "not_started" ? (
                <div className="inline-form">
                  <label>
                    <UserRound size={17} />
                    <input
                      onChange={(event) => setOwnerName(event.target.value)}
                      placeholder="Owner name"
                      value={ownerName}
                    />
                  </label>
                  <button
                    disabled={!ownerName || busyAction === "onboarding-start"}
                    onClick={() =>
                      void run("onboarding-start", async () => {
                        await api.startOnboarding(ownerName);
                      })
                    }
                    type="button"
                  >
                    Start
                  </button>
                </div>
              ) : (
                <div className="onboarding-state">
                  <p>{status?.onboarding.status}</p>
                  <button
                    disabled={
                      status?.onboarding.status === "completed" || busyAction === "onboarding-complete"
                    }
                    onClick={() =>
                      void run("onboarding-complete", async () => {
                        await api.completeOnboarding();
                      })
                    }
                    type="button"
                  >
                    Complete
                  </button>
                </div>
              )}
            </section>
          </section>
        ) : null}

        {activeTab === "profiles" ? (
          <ProfilesPanel
            profiles={status?.profiles ?? null}
            secrets={status?.secrets ?? []}
            onActivate={activateProfiles}
            onCreateAuth={createAuthProfile}
            onCreateBrain={createBrainProfile}
            onCreateClient={createClientProfile}
            onCreateServer={createServerProfile}
          />
        ) : null}

        {activeTab === "secrets" ? (
          <SecretsPanel
            onCreateSecret={createSecret}
            onDeleteSecret={deleteSecret}
            onServerLogin={serverLogin}
            secrets={status?.secrets ?? []}
          />
        ) : null}

        {activeTab === "memory" ? (
          <MemoryPanel
            memories={status?.memories ?? []}
            onCreateMemory={createMemory}
            onDeleteMemory={deleteMemory}
            onUpdateMemory={updateMemory}
          />
        ) : null}

        {activeTab === "control" ? (
          <ControlPanel
            actions={status?.actions ?? []}
            controlEpoch={status?.controlEpoch ?? 0}
            controlOwner={status?.controlOwner ?? "NONE"}
            onRequestAction={requestAction}
            screenshot={status?.screenshot ?? null}
            tasks={status?.tasks ?? []}
            onCancelTask={cancelTask}
            onRunTask={runTask}
            onSetControlOwner={setControlOwner}
            onSubmitTask={createTask}
          />
        ) : null}
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <section className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}
