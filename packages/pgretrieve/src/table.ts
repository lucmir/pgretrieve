import { ident, parseTable, qualified, type TableRef } from "./sql.js";
import type { PgRetrieveConfig, Queryable } from "./types.js";

export const SCHEMA = "pgretrieve";

export interface ResolvedTable {
  /** The user's table, quoted: `"public"."docs"`. */
  source: string;
  /** Our sidecar table, quoted: `pgretrieve."docs"`. */
  sidecar: string;
  /** Unquoted sidecar name, used to derive index names. */
  sidecarName: string;
  pk: { column: string; type: string };
}

/** Sidecar table name: `docs` for `public.docs`, `<schema>__docs` otherwise. */
export function sidecarName(t: TableRef): string {
  return t.schema === "public" ? t.name : `${t.schema}__${t.name}`;
}

/** Validates the user's table against the config and resolves the names we need. */
export async function resolveTable(db: Queryable, config: PgRetrieveConfig): Promise<ResolvedTable> {
  const table = parseTable(config.table);
  const source = qualified(table);

  const exists = await db.query("select to_regclass($1) as oid", [source]);
  if (exists.rows[0].oid === null) {
    throw new Error(`Table ${source} not found.`);
  }

  const pk = await db.query(
    `select a.attname as column, format_type(a.atttypid, a.atttypmod) as type
     from pg_index i
     join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
     where i.indrelid = $1::regclass and i.indisprimary`,
    [source],
  );
  if (pk.rows.length !== 1) {
    throw new Error(`Table ${source} needs a single-column primary key (found ${pk.rows.length} key columns).`);
  }

  const cols = await db.query(
    "select attname from pg_attribute where attrelid = $1::regclass and attnum > 0 and not attisdropped",
    [source],
  );
  const existing = new Set(cols.rows.map((r) => r.attname as string));
  for (const col of config.textColumns) {
    if (!existing.has(col)) {
      throw new Error(`Table ${source} has no column "${col}".`);
    }
  }

  const name = sidecarName(table);
  return { source, sidecar: `${SCHEMA}.${ident(name)}`, sidecarName: name, pk: pk.rows[0] };
}
