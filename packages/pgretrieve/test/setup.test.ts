import type pg from "pg";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { type Embedder, pgretrieve } from "../src/index.js";
import { createTestDb } from "./helpers/db.js";

const embedder: Embedder = {
  model: "fake",
  dimensions: 3,
  embed: async (texts) => texts.map(() => [0, 0, 0]),
};

let db: Awaited<ReturnType<typeof createTestDb>>;
let pool: pg.Pool;
let sidecar: string;

beforeEach(async () => {
  db = await createTestDb();
  pool = db.pool;
  sidecar = `pgretrieve."${db.schema}__docs"`;
  await pool.query(`
    create table ${db.schema}.docs (
      id bigserial primary key,
      title text not null,
      content text not null,
      category text
    );
    insert into ${db.schema}.docs (title, content, category) values
      ('Terminating your subscription', 'Go to Settings, Billing and click End subscription.', 'billing'),
      ('Cancellation fees', 'If you cancel before the end of an annual plan, a fee applies.', 'billing'),
      ('Error E1043 when paying', 'E1043 means your card was declined.', 'payments');
  `);
});

afterEach(async () => {
  await db.cleanup();
});

function retriever(overrides: Partial<Parameters<typeof pgretrieve>[0]> = {}) {
  return pgretrieve({
    db: pool,
    table: `${db.schema}.docs`,
    textColumns: ["title", "content"],
    embedder,
    ...overrides,
  });
}

describe("setup()", () => {
  test("creates an empty sidecar table in the pgretrieve schema", async () => {
    await retriever().setup();

    const { rows } = await pool.query(`select count(*)::int as n from ${sidecar}`);
    expect(rows[0].n).toBe(0);
  });

  test("leaves the user's table untouched: no new columns, triggers or dependencies", async () => {
    await retriever().setup();

    const cols = await pool.query(
      `select column_name from information_schema.columns
       where table_schema = $1 and table_name = 'docs' order by ordinal_position`,
      [db.schema],
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual(["id", "title", "content", "category"]);

    const triggers = await pool.query(
      "select count(*)::int as n from pg_trigger where tgrelid = $1::regclass",
      [`${db.schema}.docs`],
    );
    expect(triggers.rows[0].n).toBe(0);

    // A foreign key from the sidecar would make these fail.
    await pool.query(`truncate ${db.schema}.docs`);
    await pool.query(`drop table ${db.schema}.docs`);
  });

  test("can run twice safely", async () => {
    await retriever().setup();
    await retriever().setup();
  });

  test("dryRun returns the SQL without changing the database", async () => {
    const { statements } = await retriever().setup({ dryRun: true });

    expect(statements.join("\n")).toContain("create table if not exists");
    const { rows } = await pool.query("select to_regclass($1) as t", [sidecar]);
    expect(rows[0].t).toBeNull();
  });

  test("rejects tables without a single-column primary key", async () => {
    await pool.query(`create table ${db.schema}.nopk (body text)`);

    await expect(retriever({ table: `${db.schema}.nopk`, textColumns: ["body"] }).setup()).rejects.toThrow(
      /single-column primary key/,
    );
  });

  test("rejects text columns that don't exist", async () => {
    await expect(retriever({ textColumns: ["title", "body"] }).setup()).rejects.toThrow(/column "body"/);
  });

  test("rejects embeddings too large for the vector index", async () => {
    await expect(retriever({ embedder: { ...embedder, dimensions: 3072 } }).setup()).rejects.toThrow(
      /2000 dimensions/,
    );
  });
});
