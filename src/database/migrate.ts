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

import { readMigrationFiles } from "drizzle-orm/migrator";
import { sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type * as schemaType from "./schema/sqlite";

export type DatabaseType = "sqlite" | "mysql" | "postgresql";
export type MigrationSchema = typeof schemaType;
export type MigrationDb = (BaseSQLiteDatabase<any, any> | MySql2Database<any> | NodePgDatabase<any>) & {
    insert: (table: any) => any;
    select: (fields?: any) => any;
    update: (table: any) => any;
    delete: (table: any) => any;
    execute: (query: any) => Promise<any>;
    run?: (query: any) => any;
    all?: (query: any) => any;
    transaction: any;
    [key: string]: any;
};

/** Helper eksekusi SQL untuk SQLite, MySQL, maupun PostgreSQL */
async function execSql(db: any, query: any) {
    return typeof db.run === "function" ? db.run(query) : await db.execute(query);
}

async function getAppliedMigrations(db: any, type: DatabaseType, table: any): Promise<Set<number>> {
    try {
        let rows: any[] = [];
        if (type === "sqlite") {
            rows = db.all(sql`SELECT created_at FROM ${table}`);
        } else {
            const res = await db.execute(sql`SELECT created_at FROM ${table}`);
            rows = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : (res?.rows || []);
        }
        return new Set(rows.map((r: any) => Number(r.created_at ?? r.CREATED_AT)));
    } catch {
        return new Set();
    }
}

/** Jalankan hook TypeScript yang bersangkutan (jika ada di database/migrations/hooks/) */
async function runHook(db: MigrationDb, type: DatabaseType, tag: string) {
    const hooksDir = path.resolve("./database/migrations/hooks");
    if (!existsSync(hooksDir)) return;

    const files: string[] = readdirSync(hooksDir);
    const prefix = tag.split("_")[0]; // e.g. "0000"
    const match = files.find((f: string) => f.startsWith(tag) || f.startsWith(prefix));
    if (!match) return;

    console.log(`[HOOK] Menjalankan ${match}...`);
    const mod = await import(path.join(hooksDir, match));
    const fn = mod.default || mod.up || mod.afterMigration;
    if (typeof fn === "function") {
        await fn(db, type);
    }
}

export async function migrate_up(
    db: BaseSQLiteDatabase<any, any> | MySql2Database<any> | NodePgDatabase<any>,
    db_type?: DatabaseType
) {
    const type = db_type || (Bun.env.DB_TYPE as DatabaseType) || "sqlite";
    const folder = `./database/migrations/${type}`;

    // 1. Pastikan tabel migrasi Drizzle sudah ada
    if (type === "postgresql") {
        await execSql(db, sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
    }
    const table = type === "postgresql" ? sql`drizzle."__drizzle_migrations"` : sql`__drizzle_migrations`;
    await execSql(db, sql`
        CREATE TABLE IF NOT EXISTS ${table} (
            id SERIAL PRIMARY KEY,
            hash TEXT NOT NULL,
            created_at BIGINT
        )
    `);

    // 2. Baca riwayat migrasi dan daftar file migrasi
    const applied = await getAppliedMigrations(db, type, table);
    const migrations = readMigrationFiles({ migrationsFolder: folder });

    // 3. Baca meta journal untuk mendapatkan tag nama file (misal 0000_init)
    const journalPath = path.resolve(`${folder}/meta/_journal.json`);
    const journal = existsSync(journalPath) ? JSON.parse(await Bun.file(journalPath).text()) : null;

    // 4. Eksekusi migrasi yang belum jalan secara berurutan
    for (const m of migrations) {
        if (applied.has(m.folderMillis)) continue;

        const entry = journal?.entries?.find((e: any) => e.when === m.folderMillis);
        const tag = entry?.tag || `${m.folderMillis}`;

        console.log(`[MIGRATE] Menerapkan ${tag}...`);

        // a. Eksekusi DDL SQL
        for (const query of m.sql) {
            if (query.trim()) await execSql(db, sql.raw(query));
        }

        // b. Simpan riwayat ke __drizzle_migrations
        await execSql(db, sql`INSERT INTO ${table} (hash, created_at) VALUES (${m.hash}, ${m.folderMillis})`);
        applied.add(m.folderMillis);

        // c. Jalankan hook TypeScript
        await runHook(db as MigrationDb, type, tag);
    }
}
