/**
 * Database Client
 *
 * Local embedded SQLite database for benchmark results.
 * Uses @tursodatabase/database for local-first storage.
 */

import { join } from "node:path";
import { connect } from "@tursodatabase/database";

/** Database stored in packages/core/src/db/results.db */
const DB_PATH = join(import.meta.dirname, "results.db");

type Database = Awaited<ReturnType<typeof connect>>;

let db: Database | null = null;

const getDb = async (): Promise<Database> => {
  if (!db) {
    db = await connect(DB_PATH);
  }
  return db;
};

export { getDb, DB_PATH };
export type { Database };
