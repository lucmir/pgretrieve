import { ident } from "./sql.js";
import { type ResolvedTable, resolveTable, SCHEMA } from "./table.js";
import type { PgRetrieveConfig } from "./types.js";

// pgvector's HNSW index supports up to 2000 dimensions for the `vector` type.
const MAX_INDEXED_DIMENSIONS = 2000;

export interface SetupOptions {
  /** Return the SQL without running it. */
  dryRun?: boolean;
}

export interface SetupResult {
  statements: string[];
}

/**
 * Creates the sidecar table and indexes in the `pgretrieve` schema.
 * The user's table is only read: no new columns, triggers or foreign keys.
 */
export async function setup(config: PgRetrieveConfig, opts: SetupOptions = {}): Promise<SetupResult> {
  const { dimensions } = config.embedder;
  if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > MAX_INDEXED_DIMENSIONS) {
    throw new Error(
      `Embedder dimensions must be between 1 and ${MAX_INDEXED_DIMENSIONS} dimensions (the vector index limit), got ${dimensions}.`,
    );
  }

  const table = await resolveTable(config.db, config);
  const statements = buildStatements(table, dimensions);

  if (!opts.dryRun) {
    // One multi-statement query runs as a single transaction: all or nothing.
    await config.db.query(statements.join(";\n"));
  }
  return { statements };
}

function buildStatements(t: ResolvedTable, dimensions: number): string[] {
  return [
    "create extension if not exists vector",
    `create schema if not exists ${SCHEMA}`,
    // No foreign key to the user's table: it would block their TRUNCATE / DROP TABLE.
    // sync() removes rows whose source row is gone.
    `create table if not exists ${t.sidecar} (
  source_id ${t.pk.type} primary key,
  tsv tsvector not null,
  text_hash text not null,
  embedding vector(${dimensions}),
  embedded_hash text,
  embedding_model text
)`,
    `create index if not exists ${ident(`${t.sidecarName}_tsv_idx`)} on ${t.sidecar} using gin (tsv)`,
    `create index if not exists ${ident(`${t.sidecarName}_embedding_idx`)} on ${t.sidecar} using hnsw (embedding vector_cosine_ops)`,
  ];
}
