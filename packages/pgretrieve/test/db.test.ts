import { expect, test } from "vitest";
import { createTestDb } from "./helpers/db.js";

test("connects to Postgres with pgvector and an isolated schema", async () => {
  const db = await createTestDb();
  try {
    const ext = await db.pool.query("select 1 from pg_extension where extname = 'vector'");
    expect(ext.rows).toHaveLength(1);

    const schema = await db.pool.query("select 1 from pg_namespace where nspname = $1", [db.schema]);
    expect(schema.rows).toHaveLength(1);
  } finally {
    await db.cleanup();
  }
});
