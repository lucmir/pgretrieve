import pg from "pg";
import { DATABASE_URL } from "./helpers/db.js";

// Runs once before all test files: create shared objects up front so parallel
// test files don't race on "create extension/schema if not exists".
export default async function () {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  await client.query("create extension if not exists vector; create schema if not exists pgretrieve");
  await client.end();
}
