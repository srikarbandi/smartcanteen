// Drops all SmartCanteen objects (db/reset.sql) then reloads schema + seed.
//   npm run db:reset
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cfg } from "./_env.mjs";

const c = cfg();
function run(file) {
  execFileSync("mysql", ["-h", c.host, "-P", c.port, "-u", c.adminUser, "--default-character-set=utf8mb4"], {
    input: readFileSync(path.join(process.cwd(), file), "utf8"),
    env: { ...process.env, MYSQL_PWD: c.adminPass },
    stdio: ["pipe", "inherit", "inherit"],
  });
}

try {
  console.log("Dropping objects…"); run("db/reset.sql");
  console.log("Reloading schema…"); run("db/schema.sql");
  console.log("Reseeding…");        run("db/seed.sql");
  console.log("\n✅ Database reset to a clean seeded state.");
} catch {
  console.error("❌ db:reset failed. Is MySQL running and MYSQL_ADMIN_PASSWORD correct?");
  process.exit(1);
}
