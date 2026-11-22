/**
 * Applies a single SQL file from supabase/migrations to the linked project.
 *
 * The Supabase CLI needs project privileges or a database password, so this uses
 * the same `pg` connection string approach as scripts/migrate.js.
 *
 * 1. Add to .env.local:  SUPABASE_CONNECT=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
 *    (Supabase dashboard → Project settings → Database → Connection string → URI)
 * 2. node scripts/apply-dialogue-migration.js
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const DEFAULT_MIGRATION = "202609200001_dialogue_library.sql";

async function main() {
  const connectionString = process.env.SUPABASE_CONNECT;
  if (!connectionString) {
    console.error("SUPABASE_CONNECT is not defined in .env.local");
    console.error("Copy the dashboard 'Connection string → URI' value, including the password.");
    process.exit(1);
  }

  const filename = process.argv[2] || DEFAULT_MIGRATION;
  const migrationPath = path.join(process.cwd(), "supabase", "migrations", filename);
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration not found: ${migrationPath}`);
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`Connected. Applying ${filename}…`);
    await client.query(fs.readFileSync(migrationPath, "utf8"));
    const tables = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' and table_name = 'dialogue_library'",
    );
    const buckets = await client.query("select id from storage.buckets where id = 'dialogue-audio'");
    console.log(`dialogue_library table: ${tables.rowCount ? "present" : "missing"}`);
    console.log(`dialogue-audio bucket: ${buckets.rowCount ? "present" : "missing"}`);
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
