// Application Insights must start before anything else so requests are tracked.
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  require("applicationinsights")
    .setup()
    .setAutoCollectConsole(false) // keep stdout/stderr quiet, metrics only
    .start();
}

const crypto = require("crypto");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/lab2";

const Task = mongoose.model(
  "Task",
  new mongoose.Schema({ title: String, done: { type: Boolean, default: false } })
);
const Counter = mongoose.model(
  "Counter",
  new mongoose.Schema({ _id: String, n: { type: Number, default: 0 } })
);

// Keep retrying until MongoDB is reachable; /readyz reports the state.
async function connectWithRetry() {
  try {
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
  } catch {
    setTimeout(connectWithRetry, 2000);
  }
}
connectWithRetry();

const app = express();
app.use(express.json());

// ---- health probes ----
app.get("/healthz", (_req, res) => res.send("ok"));
app.get("/readyz", (_req, res) =>
  mongoose.connection.readyState === 1 ? res.send("ready") : res.status(503).send("mongo not connected")
);

// ---- API ----
app.get("/api/visits", async (_req, res) => {
  const c = await Counter.findOneAndUpdate({ _id: "visits" }, { $inc: { n: 1 } }, { upsert: true, new: true });
  res.json({ visits: c.n });
});

app.get("/api/tasks", async (_req, res) => res.json(await Task.find().sort({ _id: 1 })));

app.post("/api/tasks", async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  res.status(201).json(await Task.create({ title }));
});

app.patch("/api/tasks/:id", async (req, res) => {
  const t = await Task.findById(req.params.id);
  if (!t) return res.sendStatus(404);
  t.done = !t.done;
  res.json(await t.save());
});

app.delete("/api/tasks/:id", async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

// CPU burner for load testing: 20,000 chained SHA-256 hashes per request.
app.get("/api/compute", (_req, res) => {
  let h = "seed";
  for (let i = 0; i < 20000; i++) h = crypto.createHash("sha256").update(h).digest("hex");
  res.json({ ok: true });
});

// ---- built React client ----
app.use(express.static(path.join(__dirname, "public")));
app.use((_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, "0.0.0.0");
