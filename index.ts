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

import { Kysely, MysqlDialect, PostgresDialect, sql } from "kysely";
import { main } from "./src/server";
import { global } from "./src/global";
import { BunSqliteDialect, get_password_hash_only } from "./src/utils/utils";
import { mkdir } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

async function database_create_req(db: Kysely<any>, version: number, current_ms: number) { // database create requirement
    if (version < 1) { // Database Version 1.0
        // roles
        await db.schema
        .createTable("roles")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("name", "varchar(255)", col => col.unique())
        .addColumn("permission_level", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .execute();

        await global.sql_dialect.insert_ignore(db.insertInto("roles").values({
            name: "Administrator",
            permission_level: global.permissions.ADMINISTRATOR,
            created_ms: current_ms,
            modified_ms: current_ms
        })).execute();

        // users
        await db.schema
        .createTable("users")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("username", "varchar(255)", col => col.unique())
        .addColumn("full_name", "text")
        .addColumn("password_hash", "text")
        .addColumn("profile_img", "text", col => col.defaultTo(null))
        .addColumn("role_id", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "users_role_fk", // nama constraint nya (kalo di sqlite mah di ignore)
            ["role_id"],
            "roles",
            ["id"],
            (cb) => cb.onDelete("cascade").onUpdate("cascade")
        )
        .execute();

        await global.sql_dialect.insert_ignore(db.insertInto("users").values({
            username: "admin",
            full_name: "Administrator",
            password_hash: get_password_hash_only(
                Bun.password.hashSync("admin", {
                    algorithm: "argon2id",
                    timeCost: global.ph_timecost,
                    memoryCost: global.ph_memorycost,
                }),
            ),
            role_id: 1,
            created_ms: current_ms,
            modified_ms: current_ms
        })).execute();

        // kategori barang
        await db.schema
        .createTable("kategori_barang")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("nama_kategori", "text", col => col.unique())
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .execute();

        await global.sql_dialect.insert_ignore(db.insertInto("kategori_barang")
        .values({
            nama_kategori: "Tidak Ada",
            created_ms: current_ms,
            modified_ms: current_ms
        })).execute();

        // barang
        await db.schema
        .createTable("barang")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("nama_barang", "text")
        .addColumn("stok_barang", "integer")
        .addColumn("kategori_barang_id", "integer")
        .addColumn("harga_modal", "integer")
        .addColumn("harga_jual", "integer")
        .addColumn("barcode_barang", "text", col => col.unique().defaultTo(null))
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "barang_kategori_fk",
            ["kategori_barang_id"],
            "kategori_barang",
            ["id"],
            (cb) => cb.onDelete("cascade").onUpdate("cascade")
        )
        .execute();

        // barang masuk
        await db.schema
        .createTable("barang_masuk")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("barang_id", "integer")
        .addColumn("deskripsi", "text")
        .addColumn("jumlah_barang", "integer")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "fk_barang_masuk_barang",
            ["barang_id"],
            "barang",
            ["id"],
            cb => cb.onDelete("cascade").onUpdate("cascade")
        )
        .execute();

        // penjualan
        await db.schema
        .createTable("penjualan")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("total_barang", "integer")
        .addColumn("total_harga_modal", "integer")
        .addColumn("total_harga_jual", "integer")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .execute();

        // penjualan_item
        await db.schema
        .createTable("penjualan_item")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("penjualan_id", "integer", col => col.notNull())
        .addColumn("barang_id", "integer", col => col.notNull())
        .addColumn("nama_barang", "text")
        .addColumn("jumlah", "bigint")
        .addColumn("harga_modal", "bigint")
        .addColumn("harga_jual", "bigint")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "fk_penjualan_item_penjualan",
            ["penjualan_id"],
            "penjualan",
            ["id"],
            cb => cb.onDelete("cascade").onUpdate("cascade")
        )
        .execute();

        // pembukuan
        await db.schema
        .createTable("pembukuan")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("tipe", "integer", col => col.check(sql`tipe IN (0,1)`))
        .addColumn("deskripsi", "text", col => col.defaultTo(null))
        .addColumn("jumlah_uang", "integer")
        .addColumn("referensi_id", "integer")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .execute();
    }
    if (version < 2) { // Database Version 2.0
        console.log("test"); 
        // retur barang
        await db.schema
        .createTable("retur_barang")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("tanggal_key", "integer", col => col.notNull())
        .addColumn("barang_id", "integer", col => col.notNull())
        .addColumn("deskripsi", "text", col => col.defaultTo(null))
        .addColumn("jumlah_barang", "integer", col => col.notNull())
        .addColumn("created_ms", "bigint", col => col.notNull())
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "fk_retur_barang_barang",
            ["barang_id"],
            "barang",
            ["id"],
            cb => cb.onDelete("cascade").onUpdate("cascade")
        )
        .execute();
    }
}

async function load_methods(baseDir = "./src/method_function") {
  const methods = readdirSync(baseDir);

    for (const method of methods) {
        const method_path = path.join(baseDir, method);
        if (!statSync(method_path).isDirectory()) continue;

        global.method_cache[method] = {};

        const files = readdirSync(method_path);
        for (const file of files) {
            if (!file.endsWith(".ts")) continue;

            const name = file.replace(".ts", "");
            const mod = await import(path.resolve(method_path, file));
            if (!mod.default) continue;

            global.method_cache[method][name.toLowerCase()] = mod.default;
        }
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
    
    database_create_req(global.database, version, Date.now());

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