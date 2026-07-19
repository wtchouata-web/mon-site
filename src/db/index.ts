import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";
import * as schema from "./schema.js";

dotenv.config();

console.log("[Rose Amour DB] Auditing database environment variables...");

const sqlUrl = process.env.SQL_URL;
const databaseUrl = process.env.DATABASE_URL;
const postgresUrl = process.env.POSTGRES_URL;

const sqlHost = process.env.SQL_HOST;
const sqlUser = process.env.SQL_USER;
const sqlPassword = process.env.SQL_PASSWORD;
const sqlPort = process.env.SQL_PORT;
const sqlDb = process.env.SQL_DB_NAME;

const pgHost = process.env.PGHOST;
const pgUser = process.env.PGUSER;
const pgPassword = process.env.PGPASSWORD;
const pgPort = process.env.PGPORT;
const pgDb = process.env.PGDATABASE;

const poolConfig: pg.PoolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

let resolvedVia = "";

if (sqlHost && sqlUser) {
  // MANDATORY CONNECTION POOLING: OBJECT METHOD for Cloud SQL and custom PG credentials
  poolConfig.host = sqlHost;
  poolConfig.user = sqlUser;
  poolConfig.password = sqlPassword;
  poolConfig.database = sqlDb || "cloud_sql_development_database";
  if (sqlPort) {
    poolConfig.port = parseInt(sqlPort);
  }
  resolvedVia = "SQL_HOST / SQL_USER Object Method (Cloud SQL)";
} else if (sqlUrl || databaseUrl || postgresUrl) {
  // Connection string fallback (for Render, Supabase, etc.)
  poolConfig.connectionString = sqlUrl || databaseUrl || postgresUrl;
  resolvedVia = sqlUrl ? "SQL_URL connection string" : (databaseUrl ? "DATABASE_URL connection string" : "POSTGRES_URL connection string");
} else if (pgHost && pgUser) {
  // Standard PG host / user Object Method fallback
  poolConfig.host = pgHost;
  poolConfig.user = pgUser;
  poolConfig.password = pgPassword;
  poolConfig.database = pgDb || "postgres";
  if (pgPort) {
    poolConfig.port = parseInt(pgPort);
  }
  resolvedVia = "PGHOST / PGUSER Object Method";
}

if (resolvedVia) {
  console.log(`[Rose Amour DB] Connection pool configured via: ${resolvedVia}`);
} else {
  console.warn("[Rose Amour DB Warning] SQL connection details are missing. Database operations will fail gracefully.");
}

// SSL Configuration Strategy
const hostToCheck = poolConfig.host || "";
const isLocal = 
  hostToCheck === "localhost" || 
  hostToCheck === "127.0.0.1" || 
  hostToCheck.startsWith("/"); // Unix domain sockets do not use SSL

if (poolConfig.connectionString) {
  const connStr = poolConfig.connectionString.toLowerCase();
  const isConnStrLocal = connStr.includes("localhost") || connStr.includes("127.0.0.1");
  if (!isConnStrLocal) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }
} else if (poolConfig.host && !isLocal) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

export const pool = new pg.Pool(poolConfig);

// Prevent pool-level errors from crashing the Node application
pool.on("error", (err) => {
  console.error("[Rose Amour DB Pool Error] Unexpected error on idle SQL pool client:", err);
});

// Create Drizzle Instance
export const db = drizzle(pool, { schema });

// Test connection function (never throws or crashes)
export async function testDbConnection(): Promise<{ connected: boolean; error?: string }> {
  if (!poolConfig.connectionString && !poolConfig.host) {
    return { connected: false, error: "No database URL or connection credentials provided." };
  }
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return { connected: true };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return { connected: false, error: err?.message || String(err) };
  }
}
