import cors = require("cors");
import dotenv = require("dotenv");
import express = require("express");
import pg = require("pg");

dotenv.config();

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

type JsonObject = Record<string, unknown>;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to start the Todo API.");
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 5,
});

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 160;
}

function getTodoId(value: string, res: express.Response): number | undefined {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(400).json({ error: "Todo ID must be a positive integer." });
    return undefined;
  }
  return id;
}

function reportDatabaseError(error: unknown, res: express.Response): void {
  console.error(
    `Todo database request failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  res.status(500).json({ error: "Todo database request failed." });
}

app.get("/todos", async (_req, res) => {
  try {
    const result = await pool.query<Todo>(
      "SELECT id, title, completed FROM todos ORDER BY id",
    );
    res.json(result.rows);
  } catch (error) {
    reportDatabaseError(error, res);
  }
});

app.get("/todos/:id", async (req, res) => {
  const id = getTodoId(req.params.id, res);
  if (id === undefined) return;

  try {
    const result = await pool.query<Todo>(
      "SELECT id, title, completed FROM todos WHERE id = $1",
      [id],
    );
    const todo = result.rows[0];
    if (!todo) {
      res.status(404).json({ error: "Todo not found." });
      return;
    }
    res.json(todo);
  } catch (error) {
    reportDatabaseError(error, res);
  }
});

app.post("/todos", async (req, res) => {
  const body = isJsonObject(req.body) ? req.body : {};
  const { title, completed } = body;

  if (!isValidTitle(title)) {
    res.status(400).json({ error: "Title must be a non-empty string of at most 160 characters." });
    return;
  }
  if (completed !== undefined && typeof completed !== "boolean") {
    res.status(400).json({ error: "Completed must be a boolean." });
    return;
  }

  try {
    const result = await pool.query<Todo>(
      `INSERT INTO todos (title, completed)
       VALUES ($1, $2)
       RETURNING id, title, completed`,
      [title.trim(), completed ?? false],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    reportDatabaseError(error, res);
  }
});

app.put("/todos/:id", async (req, res) => {
  const id = getTodoId(req.params.id, res);
  if (id === undefined) return;

  const body = isJsonObject(req.body) ? req.body : {};
  const { title, completed } = body;
  if (!isValidTitle(title)) {
    res.status(400).json({ error: "Title must be a non-empty string of at most 160 characters." });
    return;
  }
  if (typeof completed !== "boolean") {
    res.status(400).json({ error: "Completed must be a boolean." });
    return;
  }

  try {
    const result = await pool.query<Todo>(
      `UPDATE todos
       SET title = $2, completed = $3
       WHERE id = $1
       RETURNING id, title, completed`,
      [id, title.trim(), completed],
    );
    const todo = result.rows[0];
    if (!todo) {
      res.status(404).json({ error: "Todo not found." });
      return;
    }
    res.json(todo);
  } catch (error) {
    reportDatabaseError(error, res);
  }
});

app.patch("/todos/:id", async (req, res) => {
  const id = getTodoId(req.params.id, res);
  if (id === undefined) return;

  const body = isJsonObject(req.body) ? req.body : {};
  const { title, completed } = body;
  if (title === undefined && completed === undefined) {
    res.status(400).json({ error: "Provide a title or completed value to update." });
    return;
  }
  if (title !== undefined && !isValidTitle(title)) {
    res.status(400).json({ error: "Title must be a non-empty string of at most 160 characters." });
    return;
  }
  if (completed !== undefined && typeof completed !== "boolean") {
    res.status(400).json({ error: "Completed must be a boolean." });
    return;
  }

  try {
    const result = await pool.query<Todo>(
      `UPDATE todos
       SET title = COALESCE($2, title), completed = COALESCE($3, completed)
       WHERE id = $1
       RETURNING id, title, completed`,
      [id, title === undefined ? null : title.trim(), completed ?? null],
    );
    const todo = result.rows[0];
    if (!todo) {
      res.status(404).json({ error: "Todo not found." });
      return;
    }
    res.json(todo);
  } catch (error) {
    reportDatabaseError(error, res);
  }
});

app.delete("/todos/:id", async (req, res) => {
  const id = getTodoId(req.params.id, res);
  if (id === undefined) return;

  try {
    const result = await pool.query("DELETE FROM todos WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Todo not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    reportDatabaseError(error, res);
  }
});

app.get("/neon/hello", async (_req, res) => {
  const functionUrl = process.env.NEON_FUNCTION_HELLO_BASE_URL;
  if (!functionUrl) {
    res.status(503).json({ error: "Neon Hello Function URL is not configured." });
    return;
  }

  try {
    const response = await fetch(functionUrl);
    const body = await response.text();
    const contentType = response.headers.get("content-type");
    if (contentType) res.type(contentType);
    res.status(response.status).send(body);
  } catch (error) {
    console.error(
      `Neon Hello Function request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    res.status(502).json({ error: "Neon Hello Function is unavailable." });
  }
});

const port = Number(process.env.PORT) || 8698;
app.listen(port, () => {
  console.log(`Todo API listening on http://localhost:${port}`);
  console.log("Using Neon Postgres for todo data.");
});
