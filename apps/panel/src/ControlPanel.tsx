import { Ban, ListTodo, Play, Save, UserRound } from "lucide-react";
import { useState } from "react";
import type { AgentTask, ControlOwner, Status } from "./types";

interface ControlPanelProps {
  controlOwner: ControlOwner;
  tasks: AgentTask[];
  onSubmitTask: (input: {
    title: string;
    goal: string;
    priority: number;
    author: string;
  }) => Promise<void>;
  onCancelTask: (id: string) => Promise<void>;
  onSetControlOwner: (owner: ControlOwner) => Promise<void>;
}

export function ControlPanel({
  controlOwner,
  tasks,
  onSubmitTask,
  onCancelTask,
  onSetControlOwner,
}: ControlPanelProps) {
  const [form, setForm] = useState({
    title: "",
    goal: "",
    priority: "10",
    author: "owner",
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
                    <button
                      disabled={task.status === "SUCCEEDED" || task.status === "CANCELLED"}
                      onClick={() => void onCancelTask(task.id)}
                      type="button"
                    >
                      <Ban size={17} />
                      Cancel
                    </button>
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
