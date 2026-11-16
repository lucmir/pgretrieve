/** Anything with a `query` method, e.g. a `pg.Pool` or `pg.Client`. */
export interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
}

/** Turns text into vectors. Plug in any provider (Ollama, OpenAI, ...). */
export interface Embedder {
  /** Stored next to each embedding, so vectors from different models are never mixed. */
  model: string;
  /** Length of each vector; sets the size of the `vector(n)` column. */
  dimensions: number;
  /** Some models embed documents and search queries differently. */
  embed(texts: string[], opts: { kind: "document" | "query" }): Promise<number[][]>;
}

export interface PgRetrieveConfig {
  db: Queryable;
  /** `"table"` (public schema) or `"schema.table"`. */
  table: string;
  /** Columns whose text is searched, e.g. `["title", "content"]`. */
  textColumns: string[];
  embedder: Embedder;
  /** Postgres text search language, used for stemming and stop words. Default: `"english"`. */
  language?: string;
}
