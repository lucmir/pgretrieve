// Run with `pnpm play` (after `pnpm db:up`). Shows what pgretrieve does, step by step.
import pg from "pg";
import { type Embedder, pgretrieve } from "pgretrieve";
import { seed } from "./seed.ts";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5442/pgretrieve",
});

// Placeholder until the Ollama embedder lands: setup() only needs the vector size.
const embedder: Embedder = {
  model: "placeholder",
  dimensions: 768,
  embed: async (texts) => texts.map(() => new Array(768).fill(0)),
};

const search = pgretrieve({ db: pool, table: "help_articles", textColumns: ["title", "body"], embedder });

function heading(text: string) {
  console.log(`\n=== ${text} ===\n`);
}

try {
  heading("1. Seed: public.help_articles (your existing table)");
  await seed(pool);
  const { rows } = await pool.query("select id::int, category, title from help_articles order by id");
  console.table(rows);

  heading("2. setup({ dryRun: true }): the SQL setup() would run");
  const { statements } = await search.setup({ dryRun: true });
  console.log(`${statements.join(";\n\n")};`);

  heading("3. setup(): sidecar table created, still empty");
  await search.setup();
  const columns = await pool.query(
    `select column_name, data_type from information_schema.columns
     where table_schema = 'pgretrieve' and table_name = 'help_articles' order by ordinal_position`,
  );
  console.table(columns.rows);
  const count = await pool.query("select count(*)::int as rows from pgretrieve.help_articles");
  console.log(`pgretrieve.help_articles has ${count.rows[0].rows} rows. sync() will fill it (next step).`);
} finally {
  await pool.end();
}
