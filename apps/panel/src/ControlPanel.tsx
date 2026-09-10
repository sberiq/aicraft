import {
  Ban,
  Camera,
  Gamepad2,
  ListTodo,
  Monitor,
  Play,
  Save,
  Send,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import type {
  ActionRecord,
  AgentTask,
  CapturedScreenshot,
  ControlOwner,
  RenderMode,
  Status,
} from "./types";

type ActionKind = Status["actions"][number]["actionType"];

interface ControlPanelProps {
  controlOwner: ControlOwner;
  controlEpoch: number;
  tasks: AgentTask[];
  actions: ActionRecord[];
  screenshot: CapturedScreenshot | null;
  onSubmitTask: (input: {
    title: string;
    goal: string;
    priority: number;
    author: string;
  }) => Promise<void>;
  onCancelTask: (id: string) => Promise<void>;
  onRunTask: (id: string) => Promise<void>;
  onSetControlOwner: (owner: ControlOwner) => Promise<void>;
  onRequestAction: (input: {
    actionType: ActionKind;
    parameters: ActionRecord["parameters"];
    controlEpoch: number;
  }) => Promise<void>;
}

export function ControlPanel({
  controlOwner,
  controlEpoch,
  tasks,
  actions,
  screenshot,
  onSubmitTask,
  onCancelTask,
  onRunTask,
  onSetControlOwner,
  onRequestAction,
}: ControlPanelProps) {
  const [form, setForm] = useState({
    title: "",
    goal: "",
    priority: "10",
    author: "owner",
  });
  const [actionKind, setActionKind] = useState<ActionKind>("send_chat");
  const [text, setText] = useState("");
  const [lookYaw, setLookYaw] = useState("0");
  const [lookPitch, setLookPitch] = useState("0");
  const [hotbarSlot, setHotbarSlot] = useState("1");
  const [renderMode, setRenderMode] = useState<RenderMode>("ECONOMY");
  const [movement, setMovement] = useState({
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sneak: false,
    sprint: false,
  });

  const submit = () => {
    const priority = Number(form.priority);
    if (!form.title || !form.goal || !Number.isFinite(priority)) {
      return;
    }

    void onSubmitTask({
      title: form.title,
      goal: form.goal,
      priority,
      author: form.author,
    });
    setForm({ ...form, title: "", goal: "" });
  };

  const submitAction = () => {
    if (actionKind === "send_chat" || actionKind === "send_command") {
      if (!text) return;
      void onRequestAction({
        actionType: actionKind,
        parameters: { text },
        controlEpoch,
      });
      setText("");
      return;
    }

    if (actionKind === "set_render_mode") {
      void onRequestAction({
        actionType: actionKind,
        parameters: { mode: renderMode },
        controlEpoch,
      });
      return;
    }

    if (actionKind === "look") {
      const yaw = Number(lookYaw);
      const pitch = Number(lookPitch);
      if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
      void onRequestAction({
        actionType: "look",
        parameters: { yaw, pitch },
        controlEpoch,
      });
      return;
    }

    if (actionKind === "select_hotbar") {
      const slot = Number(hotbarSlot);
      if (!Number.isInteger(slot) || slot < 1 || slot > 9) return;
      void onRequestAction({
        actionType: "select_hotbar",
        parameters: { slot },
        controlEpoch,
      });
      return;
    }

    if (
      actionKind === "attack" ||
      actionKind === "use_item" ||
      actionKind === "open_inventory" ||
      actionKind === "close_screen" ||
      actionKind === "drop_item"
    ) {
      void onRequestAction({
        actionType: actionKind,
        parameters: {},
        controlEpoch,
      });
      return;
    }

    if (actionKind === "set_movement") {
      void onRequestAction({
        actionType: actionKind,
        parameters: { movement },
        controlEpoch,
      });
      return;
    }

    void onRequestAction({
      actionType: "capture_screenshot",
      parameters: {},
      controlEpoch,
    });
  };

  return (
    <div className="control-layout">
      <section className="control-section">
        <header>
          <UserRound size={18} />
          <h2>Control</h2>
        </header>
        <div className="control-owner">
          <span>{controlOwner}</span>
          <div className="toolbar">
            <button onClick={() => void onSetControlOwner("HUMAN")} type="button">
              <UserRound size={17} />
              Take control
            </button>
            <button onClick={() => void onSetControlOwner("AGENT")} type="button">
              <Play size={17} />
              Return to agent
            </button>
          </div>
        </div>
      </section>

      <section className="control-section">
        <header>
          <Monitor size={18} />
          <h2>Render</h2>
        </header>
        <div className="segmented">
          {(["ECONOMY", "OBSERVE", "INTERACTIVE"] as RenderMode[]).map((mode) => (
            <button
              className={renderMode === mode ? "selected" : ""}
              key={mode}
              onClick={() => {
                setRenderMode(mode);
                setActionKind("set_render_mode");
                onRequestAction({
                  actionType: "set_render_mode",
                  parameters: { mode },
                  controlEpoch,
                }).catch(() => undefined);
              }}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setActionKind("capture_screenshot");
            onRequestAction({
              actionType: "capture_screenshot",
              parameters: {},
              controlEpoch,
            }).catch(() => undefined);
          }}
          type="button"
        >
          <Camera size={17} />
          Capture screenshot
        </button>
        {screenshot ? (
          <figure className="screenshot-frame">
            <img alt="Minecraft client screenshot" src={screenshot.dataUrl} />
            <figcaption>{screenshot.capturedAt}</figcaption>
          </figure>
        ) : (
          <p className="muted">No screenshot yet.</p>
        )}
      </section>

      <section className="control-section">
        <header>
          <Gamepad2 size={18} />
          <h2>Movement</h2>
        </header>
        <div className="movement-grid">
          {Object.keys(movement).map((key) => (
            <label key={key}>
              <input
                checked={movement[key as keyof typeof movement]}
                onChange={(event) => {
                  const next = { ...movement, [key]: event.target.checked };
                  setMovement(next);
                  setActionKind("set_movement");
                  onRequestAction({
                    actionType: "set_movement",
                    parameters: { movement: next },
                    controlEpoch,
                  }).catch(() => undefined);
                }}
                type="checkbox"
              />
              <span>{key}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="control-section">
        <header>
          <Send size={18} />
          <h2>Client actions</h2>
        </header>
        <div className="control-form action-form">
          <label>
            <span>Type</span>
            <select
              onChange={(event) => setActionKind(event.target.value as ActionKind)}
              value={actionKind}
            >
              <option value="send_chat">send_chat</option>
              <option value="send_command">send_command</option>
              <option value="set_movement">set_movement</option>
              <option value="set_render_mode">set_render_mode</option>
              <option value="capture_screenshot">capture_screenshot</option>
              <option value="look">look</option>
              <option value="select_hotbar">select_hotbar</option>
              <option value="attack">attack</option>
              <option value="use_item">use_item</option>
              <option value="open_inventory">open_inventory</option>
              <option value="close_screen">close_screen</option>
              <option value="drop_item">drop_item</option>
            </select>
          </label>
          {actionKind === "send_chat" || actionKind === "send_command" ? (
            <label>
              <span>Text</span>
              <input
                onChange={(event) => setText(event.target.value)}
                placeholder="Hello"
                value={text}
              />
            </label>
          ) : null}
          {actionKind === "set_render_mode" ? (
            <label>
              <span>Mode</span>
              <select
                onChange={(event) => setRenderMode(event.target.value as RenderMode)}
                value={renderMode}
              >
                <option value="ECONOMY">ECONOMY</option>
                <option value="OBSERVE">OBSERVE</option>
                <option value="INTERACTIVE">INTERACTIVE</option>
              </select>
            </label>
          ) : null}
          {actionKind === "look" ? (
            <>
              <label>
                <span>Yaw</span>
                <input
                  onChange={(event) => setLookYaw(event.target.value)}
                  type="number"
                  value={lookYaw}
                />
              </label>
              <label>
                <span>Pitch</span>
                <input
                  onChange={(event) => setLookPitch(event.target.value)}
                  type="number"
                  value={lookPitch}
                />
              </label>
            </>
          ) : null}
          {actionKind === "select_hotbar" ? (
            <label>
              <span>Slot</span>
              <input
                max={9}
                min={1}
                onChange={(event) => setHotbarSlot(event.target.value)}
                type="number"
                value={hotbarSlot}
              />
            </label>
          ) : null}
          <button onClick={submitAction} type="button">
            <Send size={17} />
            Send
          </button>
        </div>

        {actions.length ? (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Input</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id}>
                  <td>{action.actionType}</td>
                  <td>{describeAction(action)}</td>
                  <td>
                    <span className={`status-pill ${action.status.toLowerCase()}`}>
                      {action.status}
                    </span>
                  </td>
                  <td>{action.result ?? "waiting"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No client actions yet.</p>
        )}
      </section>

      <section className="control-section">
        <header>
          <ListTodo size={18} />
          <h2>Tasks</h2>
        </header>
        <div className="control-form">
          <label>
            <span>Title</span>
            <input
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              value={form.title}
            />
          </label>
          <label>
            <span>Goal</span>
            <input
              onChange={(event) => setForm({ ...form, goal: event.target.value })}
              value={form.goal}
            />
          </label>
          <label>
            <span>Priority</span>
            <input
              min={0}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
              type="number"
              value={form.priority}
            />
          </label>
          <label>
            <span>Author</span>
            <input
              onChange={(event) => setForm({ ...form, author: event.target.value })}
              value={form.author}
            />
          </label>
          <button onClick={submit} type="button">
            <Save size={17} />
            Create
          </button>
        </div>

        {tasks.length ? (
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Title</th>
                <th>Status</th>
                <th>Author</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.priority}</td>
                  <td>
                    <strong>{task.title}</strong>
                    <small>{task.goal}</small>
                  </td>
                  <td>
                    <span className={`status-pill ${task.status.toLowerCase()}`}>
                      {task.status}
                    </span>
                  </td>
                  <td>{task.author}</td>
                  <td>
                    <div className="toolbar compact">
                      <button
                        disabled={task.status !== "QUEUED" && task.status !== "BLOCKED"}
                        onClick={() => void onRunTask(task.id)}
                        type="button"
                      >
                        <Play size={17} />
                        Run
                      </button>
                      <button
                        disabled={task.status === "SUCCEEDED" || task.status === "CANCELLED"}
                        onClick={() => void onCancelTask(task.id)}
                        type="button"
                      >
                        <Ban size={17} />
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No tasks yet.</p>
        )}
      </section>
    </div>
  );
}

function describeAction(action: ActionRecord): string {
  if (action.parameters.text) {
    return action.parameters.text;
  }

  if (action.parameters.mode) {
    return action.parameters.mode;
  }

  if (action.parameters.yaw !== undefined || action.parameters.pitch !== undefined) {
    return `yaw ${action.parameters.yaw ?? 0}, pitch ${action.parameters.pitch ?? 0}`;
  }

  if (action.parameters.slot !== undefined) {
    return `slot ${action.parameters.slot}`;
  }

  if (action.parameters.movement) {
    return (
      Object.entries(action.parameters.movement)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .join(", ") || "stop"
    );
  }

  return "-";
}
