import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

// For schema updates, we must use SQL_ADMIN_USER if available to avoid "permission denied for schema public"
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = (process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD) ? encodeURIComponent(process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || "") : "";
const host = process.env.SQL_HOST ? encodeURIComponent(process.env.SQL_HOST) : "";
const port = process.env.SQL_PORT || "5432";
const database = process.env.SQL_DB_NAME || "cloud_sql_development_database";

const dbUrl = process.env.SQL_URL || (
  user && password && host
    ? `postgresql://${user}:${password}@localhost:${port}/${database}?host=${host}`
    : undefined
);

if (!dbUrl) {
  console.warn("[Rose Amour DB Warning] No SQL_URL or SQL credentials found in environment!");
}

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
});
