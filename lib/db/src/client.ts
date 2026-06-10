import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// Env vars are provided by the runtime: Vercel injects them in production, and
// the entrypoints (api-server/src/index.ts for local dev, drizzle.config.ts for
// migrations) load the root .env before this module is imported. We deliberately
// avoid `import.meta.url`-based dotenv loading here so the file bundles cleanly
// into the CJS serverless bundle (esbuild empties import.meta in CJS output).
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

/**
 * postgres.js connection tuned for stateless serverless (Vercel functions)
 * talking to Supabase's transaction pooler (port 6543):
 *   - prepare: false  -> the transaction pooler (pgBouncer transaction mode)
 *                        does not support prepared statements.
 *   - max: 1          -> each short-lived function invocation needs at most one
 *                        connection; keeps us well under pooler limits.
 * The same DATABASE_URL is used unchanged.
 */
const client = postgres(connectionString, { prepare: false, max: 1 });
export const db = drizzle(client, { schema });
