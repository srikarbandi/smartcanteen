// MySQL connection pool (mysql2/promise). Single shared pool per process.
// Credentials come exclusively from environment variables — never hard-coded.
import mysql, { type Pool, type PoolConnection } from "mysql2/promise";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const {
    MYSQL_HOST = "127.0.0.1",
    MYSQL_PORT = "3306",
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE = "smartcanteen",
    MYSQL_POOL_LIMIT = "10",
  } = process.env;

  if (!MYSQL_USER) {
    throw new Error("MYSQL_USER is not set. Copy .env.example to .env.local and fill it in.");
  }

  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: Number(MYSQL_POOL_LIMIT),
    queueLimit: 0,
    // decimals as strings -> numbers for our DECIMAL columns
    decimalNumbers: true,
    namedPlaceholders: false,
  });
  return pool;
}

/**
 * Run a parameterized query. Always use ? placeholders + params to stay safe
 * from SQL injection.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

/** Fetch a single row (or null). */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length ? rows[0] : null;
}

/**
 * Run `fn` inside a transaction on a dedicated connection. Commits on success,
 * rolls back on any thrown error, and always releases the connection.
 * This is the backbone of the order-placement / cancellation concurrency work.
 */
export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore rollback error */ }
    throw err;
  } finally {
    conn.release();
  }
}
