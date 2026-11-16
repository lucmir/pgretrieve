import pg from "pg";

export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5442/pgretrieve";

/**
 * Gives each test file its own schema for user tables, so files can run in parallel.
 * Sidecar tables live in the shared `pgretrieve` schema, named `<schema>__<table>`,
 * so cleanup drops everything with this file's prefix.
 */
export async function createTestDb() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const schema = `t_${Math.random().toString(36).slice(2, 10)}`;
  await pool.query(`create schema ${schema}`);

  async function cleanup() {
    await pool.query(`drop schema if exists ${schema} cascade`);
    const { rows } = await pool.query(
      `select tablename from pg_tables where schemaname = 'pgretrieve' and tablename like $1`,
      [`${schema}\\_\\_%`],
    );
    for (const { tablename } of rows) {
      await pool.query(`drop table if exists pgretrieve."${tablename}" cascade`);
      await pool.query(`drop function if exists pgretrieve."${tablename}_sync"() cascade`);
    }
    await pool.end();
  }

  return { pool, schema, cleanup };
}
