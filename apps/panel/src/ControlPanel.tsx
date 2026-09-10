import { Ban, ListTodo, Play, Save, Send, UserRound } from "lucide-react";
import { useState } from "react";
import type { ActionRecord, AgentTask, ControlOwner, Status } from "./types";

interface ControlPanelProps {
  controlOwner: ControlOwner;
  controlEpoch: number;
  tasks: AgentTask[];
  actions: ActionRecord[];
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
    actionType: "send_chat" | "send_command";
    parameters: { text: string };
    controlEpoch: number;
  }) => Promise<void>;
}

export function ControlPanel({
  controlOwner,
  controlEpoch,
  tasks,
  actions,
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
  const [actionForm, setActionForm] = useState({
    actionType: "send_chat" as "send_chat" | "send_command",
    text: "",
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
    if (!actionForm.text) {
      return;
    }

    void onRequestAction({
      actionType: actionForm.actionType,
      parameters: { text: actionForm.text },
      controlEpoch,
    });
    setActionForm({ ...actionForm, text: "" });
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
          <Send size={18} />
          <h2>Client actions</h2>
        </header>
        <div className="control-form action-form">
          <label>
            <span>Type</span>
            <select
              onChange={(event) =>
                setActionForm({
                  ...actionForm,
                  actionType: event.target.value === "send_command" ? "send_command" : "send_chat",
                })
              }
              value={actionForm.actionType}
            >
              <option value="send_chat">send_chat</option>
              <option value="send_command">send_command</option>
            </select>
          </label>
          <label>
            <span>Text</span>
            <input
              onChange={(event) => setActionForm({ ...actionForm, text: event.target.value })}
              placeholder="Hello"
              value={actionForm.text}
            />
          </label>
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
                <th>Text</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id}>
                  <td>{action.actionType}</td>
                  <td>{action.parameters.text}</td>
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
