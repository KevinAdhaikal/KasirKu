/*
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

const migration_name = process.argv[2];

if (!migration_name) {
    console.error("Usage: bun run drizzle:generate -- <name>");
    process.exit(1);
}

const configs = [
    "./config/drizzle/mysql.config.ts",
    "./config/drizzle/postgresql.config.ts",
    "./config/drizzle/sqlite.config.ts",
];

for (const config of configs) {
    console.log(`\nGenerating ${config}...`);

    const proc = Bun.spawnSync([
        "bunx",
        "drizzle-kit",
        "generate",
        "--config",
        config,
        "--name",
        migration_name,
    ], {
        stdout: "inherit",
        stderr: "inherit",
    });

    if (proc.exitCode !== 0) {
        process.exit(proc.exitCode ?? 1);
    }
}

console.log("\nAll migrations generated successfully.");