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

import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { migrate as migrateMysql } from "drizzle-orm/mysql2/migrator";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export async function migrate_up(
    db: BaseSQLiteDatabase<any, any> | MySql2Database<any> | NodePgDatabase<any>,
    db_type: "sqlite" | "mysql" | "postgresql"
) {
    try {
        switch (db_type) {
            case "sqlite":
                migrate(db as BaseSQLiteDatabase<any, any>, { migrationsFolder: "./drizzle" });
                break;
            case "mysql":
                await migrateMysql(db as MySql2Database<any>, { migrationsFolder: "./drizzle" });
                break;
            case "postgresql":
                await migratePostgres(db as NodePgDatabase<any>, { migrationsFolder: "./drizzle" });
                break;
        }
        console.log("[INFO] Drizzle migrations completed successfully.");
    } catch (error) {
        console.error("[ERROR] Drizzle migration failed.", error);
        throw error;
    }
}
