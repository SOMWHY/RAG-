import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");
  const pool = globalForDb.pool ?? new Pool({ connectionString, max: 5 });
  if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
  return drizzle(pool, { schema });
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, property) {
    return Reflect.get(getDb(), property);
  },
});
