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

import * as sqliteSchema from "./sqlite";
import * as mysqlSchema from "./mysql";
import * as postgresqlSchema from "./postgresql";

export type SQLiteSchema = typeof sqliteSchema;
export type MySQLSchema = typeof mysqlSchema;
export type PostgreSQLSchema = typeof postgresqlSchema;

export { sqliteSchema, mysqlSchema, postgresqlSchema };

// Active schema - set at startup based on config
let activeSchema: any = sqliteSchema;
let activeDb: any = null;

export function setActiveSchema(schema: any) {
    activeSchema = schema;
}

export function setActiveDb(db: any) {
    activeDb = db;
}

export function getDb(): any {
    if (!activeDb) throw new Error("Database not initialized");
    return activeDb;
}

export function getSchema(): any {
    return activeSchema;
}
