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

import { Kysely, MysqlDialect, PostgresDialect } from "kysely";
import { migrate_up } from "./src/database/migrate"
import { main } from "./src/server";
import { global } from "./src/global";
import { BunSqliteDialect } from "./src/utils/utils";
import { mkdir } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

async function load_methods(baseDir = "./src/method_function", rootDir = baseDir, cache = global.method_cache) {
    const entries = readdirSync(baseDir);

    for (const entry of entries) {
        const fullPath = path.join(baseDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            await load_methods(fullPath, rootDir, cache);
            continue;
        }

        if (!entry.endsWith(".ts")) continue;

        const relative = path
            .relative(rootDir, fullPath)
            .replaceAll("\\", "/");

        const parts = relative.split("/");

        const method = parts.shift();
        const route = "/" + parts.join("/").slice(0, -3);

        const key = `${method}:${route}`;

        const mod = await import(path.resolve(fullPath));

        if (!mod.default) continue;

        cache[key] = mod.default;
    }
}

async function prepare() {
    await Bun.$`bun src/prepare.ts`;

    global.config = (await Bun.file("config.json").exists()) ? JSON.parse(await Bun.file("config.json").text()) : global.config;

    switch(global.config.db_type) {
        case "sqlite": {
            const { Database } = await import("bun:sqlite");
            if (!(await Bun.file(`database/${global.config.db_name}.db`).exists())) {
                try {
                    await mkdir("database");
                } catch(e) {
                    console.log("[WARNING]:", e)
                }
            }

            global.database = new Kysely({
                dialect: new BunSqliteDialect({
                    database: new Database(`database/${global.config.db_name}.db`)
                })
            });

            global.sql_dialect.id_column = col => col.primaryKey();
            break;
        }
        case "mysql": {
            const { createConnection } = await import("mysql2/promise");
            const { createPool } = await import("mysql2");
            const tmp_conn = await createConnection({
                host: global.config.mysql.host,
                user: global.config.mysql.user,
                password: global.config.mysql.password
            })
            await tmp_conn.query(`CREATE DATABASE IF NOT EXISTS ${global.config.db_name}`);
            await tmp_conn.end();

            global.database = new Kysely<any>({
                dialect: new MysqlDialect({
                    pool: createPool({
                        host: global.config.mysql.host,
                        port: global.config.mysql.port,
                        user: global.config.mysql.user,
                        password: global.config.mysql.password,
                        database: global.config.db_name
                    })
                })
            })

            global.sql_dialect.id_column = col => col.primaryKey().autoIncrement();
            break;
        }
        case "postgresql": {
            const { Client, Pool } = await import("pg");

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

            global.database = new Kysely<any>({
                dialect: new PostgresDialect({
                    pool: new Pool({
                        host: global.config.postgresql.host,
                        port: global.config.postgresql.port,
                        user: global.config.postgresql.user,
                        password: global.config.postgresql.password,
                        database: global.config.db_name
                    })
                })
            })

            global.sql_dialect.insert_ignore = (q) => {return  q.onConflict(oc => oc.doNothing())};
            global.sql_dialect.id_column = col => col.primaryKey().generatedAlwaysAsIdentity();
            global.sql_dialect.insert_return_id = async (db: Kysely<any>, table: string, values: {}): Promise<Number> => {
                const result = await db
                    .insertInto(table)
                    .values(values).returning("id")
                    .executeTakeFirstOrThrow()

                return Number(result.id)
            }
            break;
        }
        default: {
            console.log("[ERROR] Unknown database type:", global.config.db_type);
            process.exit(0);
        }
    }

    await load_methods();

    let version: any = null;
    try {
        version = Number((await global.database.selectFrom("kasirku").select("v").where("k", "=", "version").executeTakeFirst())?.v ?? 0);
    } catch(e) {
        await global.database.schema
            .createTable("kasirku")
            .ifNotExists()
            .addColumn("k", "text")
            .addColumn("v", "text")
        .execute();
        
        version = 0;
    }

    await migrate_up(global.database, version);

    if (version === 0) {
        await global.sql_dialect.insert_ignore(global.database.insertInto("kasirku")
        .values({ k: "version", v: "2" }))
        .execute();
    } else {
        await global.database
        .updateTable("kasirku")
        .set({ v: "2" })
        .where("k", "=", "version")
        .execute();
    }
    
    console.log("[LOG] All ready!");
}

await prepare();
main();