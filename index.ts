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

import { migrate_up } from "./src/database/migrate";
import { sql } from "drizzle-orm";
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

async function update_old_db(db: any) {
    console.log("[LOG] Old database detected! Starting migration to new Drizzle structure...");

    const backup_table = {
        roles: [] as any[],
        users: [] as any[],
        kategori_barang: [] as any[],
        barang: [] as any[],
        barang_masuk: [] as any[],
        penjualan: [] as any[],
        penjualan_item: [] as any[],
        pembukuan: [] as any[],
        retur_barang: [] as any[],
    };

    const tableKeys = Object.keys(backup_table) as (keyof typeof backup_table)[];

    switch (Bun.env.DB_TYPE) {
        case "sqlite": {
            for (const table of tableKeys) {
                try {
                    backup_table[table] = db.all(sql.raw(`SELECT * FROM "${table}"`));
                } catch {
                    backup_table[table] = [];
                }
            }
            if (backup_table.barang.length === 0) {
                try {
                    backup_table.barang = db.all(sql.raw(`SELECT * FROM "daftar_barang"`));
                } catch {}
            }

            await db.run(sql.raw("PRAGMA foreign_keys = OFF;"));
            for (const table of [...tableKeys, "daftar_barang", "kasirku"]) {
                try { await db.run(sql.raw(`DROP TABLE IF EXISTS "${table}";`)); } catch {}
            }
            try {
                await db.run(sql.raw('DROP TABLE IF EXISTS "__kasirku_migrations";'));
                await db.run(sql.raw('DROP TABLE IF EXISTS "__drizzle_migrations";'));
            } catch {}
            await db.run(sql.raw("PRAGMA foreign_keys = ON;"));
            break;
        }
        case "mysql": {
            for (const table of tableKeys) {
                try {
                    const [rows] = await db.execute(sql.raw(`SELECT * FROM \`${table}\``));
                    backup_table[table] = Array.isArray(rows) ? rows : (rows?.rows || []);
                } catch {
                    backup_table[table] = [];
                }
            }
            if (backup_table.barang.length === 0) {
                try {
                    const [rows] = await db.execute(sql.raw("SELECT * FROM `daftar_barang`"));
                    backup_table.barang = Array.isArray(rows) ? rows : (rows?.rows || []);
                } catch {}
            }

            // Nonaktifkan pemeriksaan foreign key sementara untuk membersihkan tabel lama
            await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 0;"));
            for (const table of [...tableKeys, "daftar_barang", "kasirku"]) {
                try { await db.execute(sql.raw(`DROP TABLE IF EXISTS \`${table}\`;`)); } catch {}
            }
            try {
                await db.execute(sql.raw('DROP TABLE IF EXISTS `__kasirku_migrations`;'));
                await db.execute(sql.raw('DROP TABLE IF EXISTS `__drizzle_migrations`;'));
            } catch {}
            await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 1;"));
            break;
        }
        case "postgresql": {
            for (const table of tableKeys) {
                try {
                    const res = await db.execute(sql.raw(`SELECT * FROM "${table}"`));
                    backup_table[table] = res?.rows || [];
                } catch {
                    backup_table[table] = [];
                }
            }
            if (backup_table.barang.length === 0) {
                try {
                    const res = await db.execute(sql.raw(`SELECT * FROM "daftar_barang"`));
                    backup_table.barang = res?.rows || [];
                } catch {}
            }

            for (const table of [...tableKeys, "daftar_barang", "kasirku"]) {
                try { await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE;`)); } catch {}
            }
            try {
                await db.execute(sql.raw('DROP TABLE IF EXISTS "__kasirku_migrations" CASCADE;'));
                await db.execute(sql.raw('DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;'));
            } catch {}
            break;
        }
    }

    await migrate_up(db, Bun.env.DB_TYPE as any);
    const schema = (await import(`./src/database/schema/${Bun.env.DB_TYPE}`)) as any;

    try {
        if (backup_table.users.length > 0) await db.delete(schema.users);
        if (backup_table.roles.length > 0) await db.delete(schema.roles);
        if (backup_table.kategori_barang.length > 0) await db.delete(schema.kategori_barang);
    } catch (e) {
        console.warn("[UPDATE_OLD_DB] Gagal membersihkan data seed inisialisasi:", e);
    }

    const isPg = Bun.env.DB_TYPE === "postgresql";

    async function insertRows(tableSchema: any, rows: any[]) {
        if (!rows || rows.length === 0) return;
        const chunkSize = 100;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            if (isPg) {
                await db.insert(tableSchema).overridingSystemValue().values(chunk);
            } else {
                await db.insert(tableSchema).values(chunk);
            }
        }
    }

    if (backup_table.roles.length > 0) await insertRows(schema.roles, backup_table.roles);
    if (backup_table.users.length > 0) await insertRows(schema.users, backup_table.users);
    if (backup_table.kategori_barang.length > 0) await insertRows(schema.kategori_barang, backup_table.kategori_barang);
    if (backup_table.barang.length > 0) await insertRows(schema.barang, backup_table.barang);
    if (backup_table.barang_masuk.length > 0) await insertRows(schema.barang_masuk, backup_table.barang_masuk);
    if (backup_table.penjualan.length > 0) await insertRows(schema.penjualan, backup_table.penjualan);
    if (backup_table.penjualan_item.length > 0) {
        const mappedItems = backup_table.penjualan_item.map((item: any) => ({
            ...item,
            total_harga_modal: item.total_harga_modal ?? (Number(item.harga_modal || 0) * Number(item.jumlah || 0)),
            total_harga_jual: item.total_harga_jual ?? (Number(item.harga_jual || 0) * Number(item.jumlah || 0)),
        }));
        await insertRows(schema.penjualan_item, mappedItems);
    }
    if (backup_table.pembukuan.length > 0) await insertRows(schema.pembukuan, backup_table.pembukuan);
    if (backup_table.retur_barang.length > 0) await insertRows(schema.retur_barang, backup_table.retur_barang);

    if (isPg) {
        for (const tableName of tableKeys) {
            try {
                await db.execute(
                    sql.raw(`SELECT setval('${tableName}_id_seq', (SELECT COALESCE(MAX(id), 1) FROM "${tableName}"));`)
                );
            } catch {}
        }
    }

    console.log("[LOG] Old database successfully ported to new Drizzle structure!");
}

async function prepare() {
    console.log("[LOG] Preparing Server...");

    await mkdir("./profile_img", { recursive: true });
    const global = (await import("./src/global")).global;

    let check_old_db = 0;

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
            global.schema = await import("./src/database/schema/sqlite");

            check_old_db = sqlite.query(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'kasirku' LIMIT 1`).get() ? 1 : 0;
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
            global.schema = (await import("./src/database/schema/mysql")) as any; 

            const [rows] = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'kasirku' LIMIT 1`);
            check_old_db = (rows as any[]).length > 0 ? 1 : 0;
            break;
        }
        case "postgresql": {
            const { Pool } = await import("pg");
            const { drizzle } = await import("drizzle-orm/node-postgres");

            const pool = new Pool({
                host: Bun.env.POSTGRES_HOST || Bun.env.POSTGRESQL_HOST,
                port: Number(Bun.env.POSTGRES_PORT || Bun.env.POSTGRESQL_PORT),
                user: Bun.env.POSTGRES_USER || Bun.env.POSTGRESQL_USER,
                password: Bun.env.POSTGRES_PASSWORD || Bun.env.POSTGRESQL_PASSWORD,
                database: Bun.env.DB_NAME
            });
            global.database = drizzle({ client: pool });
            global.schema = (await import("./src/database/schema/postgresql")) as any;

            const result = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'kasirku' LIMIT 1`);
            check_old_db = result.rows.length > 0 ? 1 : 0;

            break;
        }
        default: {
            console.log("[ERROR] Unknown database type:", Bun.env.DB_TYPE);
            process.exit(0);
        }
    }

    await load_methods("./src/method_function", "./src/method_function", global.method_cache);

    if (check_old_db) await update_old_db(global.database); // kita harus update old db nya jadi new db structure (yaitu ada drizzle loh ya)
    await migrate_up(global.database, Bun.env.DB_TYPE as any);
    
    console.log("[LOG] All ready!");
}

if (!check_env_file()) {
    const { setup_http_main } = await import("./src/setup");
    console.log("[LOG] Config File not found! Running Setup Page...");
    const sig = await setup_http_main();
    await sig.wait();

    try {loadEnvFile();} catch {process.exit(0)}
    if (!check_env_file()) process.exit(0); // kita cek lagi dua kali
}

const { main } = await import("./src/server");
await prepare();
main();