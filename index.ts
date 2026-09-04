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
import { mkdir } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { setup_http_main } from "./src/setup";

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

function get_env_value(key: string): string | undefined {
    const value = Bun.env[key] ?? process.env[key];
    if (value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function check_env_file() {
    const keys = [
        "APP_LISTEN_PORT",
        "APP_USE_TLS",
        "APP_COMPILE_HTML",
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

    for (const key of keys) {
        if (!get_env_value(key)) return false;
    }

    return true;
}

async function prepare() {
    const global = (await import("./src/global")).global;
    await Bun.$`bun src/prepare.ts`;

    global.config = Bun.env as unknown as Record<string, any>;

    switch(global.config.db_type) {
        case "sqlite": {
            const { Database } = await import("bun:sqlite");
            const { drizzle } = await import("drizzle-orm/bun-sqlite");

            if (!(await Bun.file(`database/${global.config.db_name}.db`).exists())) {
                try {
                    await mkdir("database");
                } catch(e) {
                    console.log("[WARNING]:", e)
                }
            }

            const sqlite = new Database(`database/${global.config.db_name}.db`);
            global.database = drizzle({ client: sqlite });
            const sqliteSchema = await import("./src/database/schema/sqlite");
            setActiveSchema(sqliteSchema);
            setActiveDb(global.database);
            break;
        }
        case "mysql": {
            const mysql = await import("mysql2/promise");
            const { drizzle } = await import("drizzle-orm/mysql2");

            const tmp_conn = await mysql.createConnection({
                host: global.config.mysql.host,
                user: global.config.mysql.user,
                password: global.config.mysql.password
            });
            await tmp_conn.query(`CREATE DATABASE IF NOT EXISTS \`${global.config.db_name}\``);
            await tmp_conn.end();

            const pool = mysql.createPool({
                host: global.config.mysql.host,
                port: global.config.mysql.port,
                user: global.config.mysql.user,
                password: global.config.mysql.password,
                database: global.config.db_name
            });
            global.database = drizzle({ client: pool });
            const mysqlSchema = await import("./src/database/schema/mysql");
            setActiveSchema(mysqlSchema);
            setActiveDb(global.database);
            break;
        }
        case "postgresql": {
            const { Client, Pool } = await import("pg");
            const { drizzle } = await import("drizzle-orm/node-postgres");

            const client = new Client({
                host: global.config.postgresql.host,
                port: global.config.postgresql.port,
                user: global.config.postgresql.user,
                password: global.config.postgresql.password,
                database: "postgres"
            });

            await client.connect();

            const check = await client.query(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [global.config.db_name]
            );
            if (check.rowCount === 0) await client.query(`CREATE DATABASE "${global.config.db_name}"`);

            await client.end();

            const pool = new Pool({
                host: global.config.postgresql.host,
                port: global.config.postgresql.port,
                user: global.config.postgresql.user,
                password: global.config.postgresql.password,
                database: global.config.db_name
            });
            global.database = drizzle({ client: pool });
            const pgSchema = await import("./src/database/schema/postgresql");
            setActiveSchema(pgSchema);
            setActiveDb(global.database);
            break;
        }
        default: {
            console.log("[ERROR] Unknown database type:", global.config.db_type);
            process.exit(0);
        }
    }
    await load_methods("./src/method_function", "./src/method_function", global.method_cache);
    await migrate_up(global.database, global.config.db_type);
    
    console.log("[LOG] All ready!");
}

if (!check_env_file()) {
    console.log("[LOG] Config File not found! Running Setup Page...");
    setup_http_main();
} else {
    const { main } = await import("./src/server");
    await prepare();
    main();
}