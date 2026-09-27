import { $ } from "bun";

const migration_name = process.argv[2];

if (!migration_name) {
    console.error("Usage: bun run drizzle:generate -- <name>");
    process.exit(1);
}


console.log(`[DRIZZLE] Generating SQLite migrations (name: ${migration_name})...`);
await $`bunx drizzle-kit generate --config=config/drizzle/sqlite.config.ts --name=${migration_name}`;

console.log(`[DRIZZLE] Generating MySQL migrations (name: ${migration_name})...`);
await $`bunx drizzle-kit generate --config=config/drizzle/mysql.config.ts --name=${migration_name}`;

console.log(`[DRIZZLE] Generating PostgreSQL migrations (name: ${migration_name})...`);
await $`bunx drizzle-kit generate --config=config/drizzle/postgresql.config.ts --name=${migration_name}`;

const journalFile = Bun.file("database/migrations/sqlite/meta/_journal.json");

if (await journalFile.exists()) {
    try {
        const journal = await journalFile.json();

        for (const entry of journal.entries || []) {
            const hookPath = `database/migrations/hooks/${entry.tag}.ts`;
            const hookFile = Bun.file(hookPath);

            if (!(await hookFile.exists())) {
                console.log(`[DRIZZLE] Creating migration hook template: ${hookPath}...`);

                const hookTemplate = `/*
──────────────────────────────────────────────────────────────
                           KasirKu
        Simple & Efficient Point of Sale (PoS) System

            Author      : Kevin Adhaikal
            Copyright   : (C) 2026 Kevin Adhaikal
            License     : AplikasiKasir License

    Permission is granted to modify and distribute this
    software, but the author's name must not be removed
                     or altered.
──────────────────────────────────────────────────────────────
*/

import type { DatabaseType, MigrationDb, MigrationSchema } from "../../../src/database/migrate";

export default async function(db: MigrationDb, dbType: DatabaseType) {
    const schema = (await import(\`../../../src/database/schema/\${dbType}\`)) as MigrationSchema;

    // write code here.
}
`;
                await Bun.write(hookPath, hookTemplate);
            }
        }
    } catch (e) {
        console.error("[DRIZZLE] Error inspecting journal for hooks:", e);
    }
}

console.log("[DRIZZLE] All migrations generated successfully.");