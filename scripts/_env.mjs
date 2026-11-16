// Shared: load .env.local into process.env (no hard dependency on dotenv).
import { readFileSync } from "node:fs";
import path from "node:path";

export function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    console.warn("No .env.local found — relying on the shell environment.");
  }
}

export function cfg() {
  loadEnv();
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: process.env.MYSQL_PORT || "3306",
    db: process.env.MYSQL_DATABASE || "smartcanteen",
    appUser: process.env.MYSQL_USER || "smartcanteen_app",
    appPass: process.env.MYSQL_PASSWORD || "",
    adminUser: process.env.MYSQL_ADMIN_USER || "root",
    adminPass: process.env.MYSQL_ADMIN_PASSWORD || "",
  };
}
