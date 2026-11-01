"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const fs = require("node:fs/promises");
const path = require("node:path");
const pg = require("pg");
dotenv.config();
const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
    throw new Error("DATABASE_URL_UNPOOLED is required to run database migrations.");
}
async function migrate() {
    const pool = new pg.Pool({ connectionString, max: 1 });
    const client = await pool.connect();
    try {
        const migrationName = "001_create_todos.sql";
        const migrationSql = await fs.readFile(path.resolve(process.cwd(), "migrations", migrationName), "utf8");
        await client.query("BEGIN");
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
        const applied = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [migrationName]);
        if (applied.rowCount === 0) {
            await client.query(migrationSql);
            await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
                migrationName,
            ]);
            console.log(`Applied migration ${migrationName}.`);
        }
        else {
            console.log(`Migration ${migrationName} is already applied.`);
        }
        await client.query("COMMIT");
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
        await pool.end();
    }
}
migrate().catch((error) => {
    console.error(`Database migration failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});
//# sourceMappingURL=migrate.js.map