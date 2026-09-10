import { MapPin, Notebook, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MemoryKind, MemoryRecord } from "./types";

interface MemoryPanelProps {
  memories: MemoryRecord[];
  onCreateMemory: (input: {
    kind: MemoryKind;
    title: string;
    content: string;
    dimension?: string | undefined;
    position?: {
      x: number;
      y: number;
      z: number;
    } | undefined;
  }) => Promise<void>;
  onUpdateMemory: (
    id: string,
    input: Partial<{
      kind: MemoryKind;
      title: string;
      content: string;
      dimension?: string | undefined;
      position?: {
        x: number;
        y: number;
        z: number;
      } | undefined;
    }>,
  ) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
}

const memoryKinds: MemoryKind[] = [
  "place",
  "project",
  "promise",
  "server_procedure",
  "note",
];

export function MemoryPanel({
  memories,
  onCreateMemory,
  onUpdateMemory,
  onDeleteMemory,
}: MemoryPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: "note" as MemoryKind,
    title: "",
    content: "",
    dimension: "",
    x: "",
    y: "",
    z: "",
  });

  const select = (memory: MemoryRecord) => {
    setSelectedId(memory.id);
    setForm({
      kind: memory.kind,
      title: memory.title,
      content: memory.content,
      dimension: memory.dimension ?? "",
      x: memory.position ? String(memory.position.x) : "",
      y: memory.position ? String(memory.position.y) : "",
      z: memory.position ? String(memory.position.z) : "",
    });
  };

  const reset = () => {
    setSelectedId(null);
    setForm({
      kind: "note",
      title: "",
      content: "",
      dimension: "",
      x: "",
      y: "",
      z: "",
    });
  };

  const submit = () => {
    if (!form.title || !form.content) return;

    const position =
      form.x && form.y && form.z
        ? {
            x: Number(form.x),
            y: Number(form.y),
            z: Number(form.z),
          }
        : undefined;
    const input = {
      kind: form.kind,
      title: form.title,
      content: form.content,
      dimension: form.dimension || undefined,
      position,
    };

    if (selectedId) {
      void onUpdateMemory(selectedId, input);
    } else {
      void onCreateMemory(input);
    }
    reset();
  };

  return (
    <div className="profile-layout">
      <section className="profile-section wide-profile">
        <header>
          <Notebook size={18} />
          <h2>{selectedId ? "Edit memory" : "New memory"}</h2>
        </header>
        <div className="memory-form">
          <label className="field">
            <span>Kind</span>
            <select
              onChange={(event) => setForm({ ...form, kind: event.target.value as MemoryKind })}
              value={form.kind}
            >
              {memoryKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Title</span>
            <input
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              value={form.title}
            />
          </label>
          <label className="field">
            <span>Dimension</span>
            <input
              onChange={(event) => setForm({ ...form, dimension: event.target.value })}
              placeholder="minecraft:overworld"
              value={form.dimension}
            />
          </label>
          <label className="field">
            <span>X</span>
            <input
              onChange={(event) => setForm({ ...form, x: event.target.value })}
              type="number"
              value={form.x}
            />
          </label>
          <label className="field">
            <span>Y</span>
            <input
              onChange={(event) => setForm({ ...form, y: event.target.value })}
              type="number"
              value={form.y}
            />
          </label>
          <label className="field">
            <span>Z</span>
            <input
              onChange={(event) => setForm({ ...form, z: event.target.value })}
              type="number"
              value={form.z}
            />
          </label>
          <label className="field content-field">
            <span>Content</span>
            <textarea
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              value={form.content}
            />
          </label>
          <div className="toolbar">
            <button onClick={submit} type="button">
              <Save size={17} />
              {selectedId ? "Save" : "Create"}
            </button>
            {selectedId ? (
              <button onClick={reset} type="button">
                New
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="profile-section wide-profile">
        <header>
          <MapPin size={18} />
          <h2>Saved memory</h2>
        </header>
        {memories.length ? (
          <div className="memory-list">
            {memories.map((memory) => (
              <article
                className={selectedId === memory.id ? "memory-row active" : "memory-row"}
                key={memory.id}
              >
                <div>
                  <strong>{memory.title}</strong>
                  <small>
                    {memory.kind}
                    {memory.dimension ? ` · ${memory.dimension}` : ""}
                    {memory.position
                      ? ` · ${memory.position.x}, ${memory.position.y}, ${memory.position.z}`
                      : ""}
                  </small>
                  <p>{memory.content}</p>
                </div>
                <div className="toolbar compact">
                  <button onClick={() => select(memory)} type="button">
                    Edit
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => void onDeleteMemory(memory.id)}
                    title="Delete memory"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No memory records yet.</p>
        )}
      </section>
    </div>
  );
}
