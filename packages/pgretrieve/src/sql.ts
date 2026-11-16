/** Quotes an identifier (table, column, ...) so any name is safe to put in SQL. */
export function ident(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

export interface TableRef {
  schema: string;
  name: string;
}

export function parseTable(table: string): TableRef {
  const dot = table.indexOf(".");
  return dot === -1
    ? { schema: "public", name: table }
    : { schema: table.slice(0, dot), name: table.slice(dot + 1) };
}

export function qualified(t: TableRef): string {
  return `${ident(t.schema)}.${ident(t.name)}`;
}
