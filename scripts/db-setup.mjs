// ============================================================================
// One-shot MySQL setup: creates the database + app user, then loads
// db/schema.sql and db/seed.sql via the `mysql` CLI (so DELIMITER-based
// stored procedures / triggers load correctly).
//
//   npm run db:setup
//
// Uses MYSQL_ADMIN_USER / MYSQL_ADMIN_PASSWORD (root) from .env.local for the
// privileged steps, and creates MYSQL_USER / MYSQL_PASSWORD for the app.
// ============================================================================
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cfg } from "./_env.mjs";

const c = cfg();

function runSql({ sql, file, asAdmin = true, useDb = false }) {
  const user = asAdmin ? c.adminUser : c.appUser;
  const pass = asAdmin ? c.adminPass : c.appPass;
  const args = ["-h", c.host, "-P", c.port, "-u", user, "--default-character-set=utf8mb4"];
  if (useDb) args.push(c.db);
  const input = sql ?? readFileSync(path.join(process.cwd(), file), "utf8");
  execFileSync("mysql", args, {
    input,
    env: { ...process.env, MYSQL_PWD: pass },
    stdio: ["pipe", "inherit", "inherit"],
  });
}

function esc(s) { return String(s).replace(/'/g, "''"); }

try {
  console.log("1/4  Creating database + app user (as admin)…");
  runSql({
    asAdmin: true,
    sql: `
      CREATE DATABASE IF NOT EXISTS \`${c.db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      CREATE USER IF NOT EXISTS '${esc(c.appUser)}'@'localhost' IDENTIFIED BY '${esc(c.appPass)}';
      CREATE USER IF NOT EXISTS '${esc(c.appUser)}'@'127.0.0.1' IDENTIFIED BY '${esc(c.appPass)}';
      GRANT ALL PRIVILEGES ON \`${c.db}\`.* TO '${esc(c.appUser)}'@'localhost';
      GRANT ALL PRIVILEGES ON \`${c.db}\`.* TO '${esc(c.appUser)}'@'127.0.0.1';
      FLUSH PRIVILEGES;
    `,
  });

  console.log("2/4  Loading schema (tables, views, procedures, trigger, indexes)…");
  runSql({ file: "db/schema.sql", asAdmin: true });

  console.log("3/4  Loading seed data…");
  runSql({ file: "db/seed.sql", asAdmin: true });

  console.log("4/4  Verifying…");
  runSql({
    asAdmin: true, useDb: true,
    sql: "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM food_item) AS food, (SELECT COUNT(*) FROM pickup_slot) AS slots;",
  });

  console.log("\n✅ MySQL ready. App user:", c.appUser, "| DB:", c.db);
  console.log("   Next: `npm run mongo:setup` then `npm run dev`.");
} catch (err) {
  console.error("\n❌ db:setup failed.");
  console.error("   Check MYSQL_ADMIN_PASSWORD in .env.local and that MySQL is running.");
  process.exit(1);
}
