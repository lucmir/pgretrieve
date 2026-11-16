import { type SetupOptions, setup } from "./setup.js";
import type { PgRetrieveConfig } from "./types.js";

export type { SetupOptions, SetupResult } from "./setup.js";
export type { Embedder, PgRetrieveConfig, Queryable } from "./types.js";

export function pgretrieve(config: PgRetrieveConfig) {
  return {
    /** Creates the sidecar table and indexes. Safe to run again. */
    setup: (opts?: SetupOptions) => setup(config, opts),
  };
}
