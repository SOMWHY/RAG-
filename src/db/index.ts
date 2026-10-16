import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");
  /*
   * 生产环境**同样**必须缓存。
   *
   * db 是个 Proxy，每次访问属性都会走到这里。原先只在非生产环境缓存，
   * 导致生产环境每一次 db.select() 都新建一个 Pool —— 远端 Postgres 的
   * TCP + TLS 握手要几百毫秒，一个请求两次查询就是一两秒；而且新建的
   * Pool 从来不 end()，连接会一直泄漏，可能把 Neon 的连接数打满。
   *
   * 挂 globalThis 是为了 dev 下 HMR 重复求值时不重复建池；生产环境模块
   * 每个实例只求值一次，缓存同样安全。
   */
  globalForDb.pool ??= new Pool({ connectionString, max: 5 });
  return drizzle(globalForDb.pool, { schema });
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, property) {
    return Reflect.get(getDb(), property);
  },
});
