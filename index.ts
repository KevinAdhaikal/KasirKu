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

import { migrate_up } from "./src/database/migrate"
import { setActiveSchema, setActiveDb } from "./src/database/schema";
import { readdirSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";

async function load_methods(baseDir: string, rootDir: string, cache: Record<string, any>) {
    const entries = readdirSync(baseDir);

    for (const entry of entries) {
        const fullPath = path.join(baseDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            await load_methods(fullPath, rootDir, cache);
            continue;
        }

        if (!entry.endsWith(".ts")) continue;

        const relative = path.relative(rootDir, fullPath).replaceAll("\\", "/");
        const parts = relative.split("/");
        const method = parts.shift();
        const route = "/" + parts.join("/").slice(0, -3);
        const key = `${method}:${route}`;
        const mod = await import(path.resolve(fullPath));

        if (!mod.default) continue;

        cache[key] = mod.default;
    }
}

function check_env_file() {
    const keys = [
        "APP_LISTEN_PORT",
        "APP_USE_TLS",
        "DB_TYPE",
        "DB_NAME",
        "POSTGRES_HOST",
        "POSTGRES_PORT",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "MYSQL_HOST",
        "MYSQL_PORT",
        "MYSQL_USER",
        "MYSQL_PASSWORD",
        "TLS_KEY_PATH",
        "TLS_CERT_PATH",
    ];

    for (const key of keys) if (Bun.env[key] === undefined) return false;

    return true;
}

async function check_ver_db() {

}

async function prepare() {
    console.log("[LOG] Preparing Server...");

    await mkdir("./profile_img", { recursive: true });
    const global = (await import("./src/global")).global;

    switch(Bun.env.DB_TYPE) {
        case "sqlite": {
            if (!(await Bun.file(`database/${Bun.env.DB_NAME}.db`).exists())) {
                throw new Error(
                    "Database configuration is invalid or the database file was not found. " +
                    "Please remove the .env file and restart the server to open the setup page."
                );
            }

            const { Database } = await import("bun:sqlite");
            const { drizzle } = await import("drizzle-orm/bun-sqlite");

            const sqlite = new Database(`database/${Bun.env.DB_NAME}.db`);
            global.database = drizzle({ client: sqlite });
            const sqliteSchema = await import("./src/database/schema/sqlite");
            setActiveSchema(sqliteSchema);
            setActiveDb(global.database);
            
            break;
        }
        case "mysql": {
            const mysql = await import("mysql2/promise");
            const { drizzle } = await import("drizzle-orm/mysql2");

            const pool = mysql.createPool({
                host: Bun.env.MYSQL_HOST,
                port: Number(Bun.env.MYSQL_PORT),
                user: Bun.env.MYSQL_USER,
                password: Bun.env.MYSQL_PASSWORD,
                database: Bun.env.DB_NAME
            });

            global.database = drizzle({ client: pool });
            const mysqlSchema = await import("./src/database/schema/mysql");
            setActiveSchema(mysqlSchema);
            setActiveDb(global.database);

            break;
        }
        case "postgresql": {
            const { Pool } = await import("pg");
            const { drizzle } = await import("drizzle-orm/node-postgres");

            const pool = new Pool({
                host: Bun.env.POSTGRESQL_HOST,
                port: Number(Bun.env.POSTGRESQL_PORT),
                user: Bun.env.POSTGRESQL_USER,
                password: Bun.env.POSTGRESQL_PASSWORD,
                database: Bun.env.DB_NAME
            });
            global.database = drizzle({ client: pool });

            const pgSchema = await import("./src/database/schema/postgresql");
            setActiveSchema(pgSchema);
            setActiveDb(global.database);

            break;
        }
        default: {
            console.log("[ERROR] Unknown database type:", Bun.env.DB_TYPE);
            process.exit(0);
        }
    }

    await load_methods("./src/method_function", "./src/method_function", global.method_cache);
    await migrate_up(global.database, Bun.env.DB_TYPE);

    await check_ver_db();
    
    console.log("[LOG] All ready!");
}

if (!check_env_file()) {
    const { setup_http_main } = await import("./src/setup");
    console.log("[LOG] Config File not found! Running Setup Page...");
    const sig = await setup_http_main();
    await sig.wait();

    try {loadEnvFile();} catch(_) {process.exit(0)}
    if (!check_env_file()) process.exit(0); // kita cek lagi dua kali
}

const { main } = await import("./src/server");
await prepare();
main();