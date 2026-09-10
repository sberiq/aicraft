import {
  Activity,
  Bot,
  CheckCircle2,
  Copy,
  House,
  Network,
  Plug,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { ConnectorKind, Status } from "./types";

type TabId = "overview" | "deployment" | "connections" | "onboarding";

const tabs: Array<{ id: TabId; label: string; icon: typeof House }> = [
  { id: "overview", label: "Обзор", icon: Activity },
  { id: "deployment", label: "Deployment", icon: Server },
  { id: "connections", label: "Connections", icon: Network },
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
