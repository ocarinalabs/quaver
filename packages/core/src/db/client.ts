/**
 * Database Client
 *
 * Local embedded SQLite database for benchmark results.
 * Uses @tursodatabase/database for local-first storage.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "@tursodatabase/database";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Database stored in packages/core/src/db/results.db */
const DB_PATH = join(__dirname, "results.db");

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
