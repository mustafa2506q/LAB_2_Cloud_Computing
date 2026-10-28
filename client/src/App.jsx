import { useEffect, useState } from "react";

const api = (url, opts) => fetch(url, opts).then((r) => (r.status === 204 ? null : r.json()));

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [visits, setVisits] = useState("-");
  const [title, setTitle] = useState("");
  const [online, setOnline] = useState(true);

  const load = () =>
    api("/api/tasks").then((t) => { setTasks(t); setOnline(true); }).catch(() => setOnline(false));

  useEffect(() => {
    api("/api/visits").then((v) => setVisits(v.visits)).catch(() => setOnline(false));
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await api("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    load();
  };
  const toggle = async (id) => { await api(`/api/tasks/${id}`, { method: "PATCH" }); load(); };
  const remove = async (id) => { await api(`/api/tasks/${id}`, { method: "DELETE" }); load(); };

  return (
    <main className="wrap">
      <header>
        <div>
          <p className="eyebrow">FoCC Lab 2 &middot; MERN on Azure AKS</p>
          <h1>Task Tracker</h1>
        </div>
        <span className={`pill ${online ? "ok" : "bad"}`}>{online ? "API online" : "API offline"}</span>
      </header>

      <section className="stats">
        <div><span>Visitors</span><strong>{visits}</strong></div>
        <div><span>Tasks</span><strong>{tasks.length}</strong></div>
      </section>

      <form onSubmit={add} className="add">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
        <button>Add task</button>
      </form>

      <ul className="list">
        {tasks.map((t) => (
          <li key={t._id} className={t.done ? "done" : ""}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t._id)} />
              <span>{t.title}</span>
            </label>
            <button className="x" onClick={() => remove(t._id)} aria-label="Delete">&times;</button>
          </li>
        ))}
      </ul>

      <footer>Served by Express &middot; Stored in MongoDB &middot; Autoscaled by Kubernetes HPA</footer>
    </main>
  );
}
