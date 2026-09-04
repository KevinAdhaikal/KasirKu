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

import * as Bun from "bun";
import { mime_types } from "../utils/utils";
import { Connection, createConnection } from "mysql2/promise";
import { Client } from "pg";
import { Database } from "bun:sqlite";

let is_server_closed = false;
let bun_serve: any;

async function sql_connection(db_type: string, db_host: string, db_port: number, db_name: string | null, db_user: string, db_pass: string): Promise<{
    pg_conn: Client | null,
    ms_conn: Connection | null,
    message: string | null
}> {
    let pg_conn = null;
    let ms_conn = null;

    switch(db_type) {
        case "mysql": {
            try {
                ms_conn = await createConnection({
                    host: db_host,
                    port: db_port,
                    user: db_user,
                    password: db_pass,
                    ...(db_name ? { database: db_name } : {})
                });
            } catch (err) {
                return { message: err instanceof Error ? err.message : "Unknown database error", pg_conn: null, ms_conn: null }
            }
            break;
        }
        case "postgresql": {
            try {
                const conn = new Client({
                    host: db_host,
                    port: db_port,
                    user: db_user,
                    password: db_pass,
                    ...(db_name ? { database: db_name } : { database: "postgres" })
                });
                await conn.connect();
                pg_conn = conn;
            } catch (err) {
                return { message: err instanceof Error ? err.message : "Unknown database error", pg_conn: null, ms_conn: null }
            }
            break;
        }
        default: {
            return { "message": "Invalid DB!", pg_conn: null, ms_conn: null }
        }
    }

    return {"message": null, pg_conn, ms_conn};
}

async function insert_rows_mysql(conn: NonNullable<Connection>, table: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const placeholders = rows.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
    const values = rows.flatMap(row => columns.map(column => row[column]));
    await conn.query(`INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(", ")}) VALUES ${placeholders}`, values);
}

async function insert_rows_pg(conn: NonNullable<Client>, table: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const values = rows.flatMap(row => columns.map(column => row[column]));
    const placeholders = rows.map((_, row_index) => `(${columns.map((_, column_index) => `$${row_index * columns.length + column_index + 1}`).join(", ")})`).join(", ");
    await conn.query(`INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(", ")}) VALUES ${placeholders}`, values);
}

async function POST_TestConnection(req: Request) {
    let req_json: Record<string, unknown>;

    try {
        req_json = await req.json();
    } catch {
        return new Response("Bad Request", { status: 400 });
    }

    const db_type = typeof req_json.db_type === "string" ? req_json.db_type.trim() : "";
    const db_host = typeof req_json.db_host === "string" ? req_json.db_host.trim() : "";
    const db_port = typeof req_json.db_port === "number" ? req_json.db_port : Number(req_json.db_port ?? 0);
    const db_name = typeof req_json.db_name === "string" ? req_json.db_name.trim() : "";
    const db_user = typeof req_json.db_user === "string" ? req_json.db_user.trim() : "";
    const db_pass = typeof req_json.db_pass === "string" ? req_json.db_pass : "";
    
    if (!db_type || !db_host || !Number.isInteger(db_port) || db_port < 1 || db_port > 65535 || !db_name || !db_user) {
        return new Response("Bad Request", { status: 400 });
    }
    
    const identifierRegex = /^[a-zA-Z0-9_-]+$/;
    if (!identifierRegex.test(db_name)) return new Response("Bad Request", { status: 400 });
    if (!identifierRegex.test(db_user)) return new Response("Bad Request", { status: 400 });

    const sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
    if (sql_conn.message !== null) return new Response(sql_conn.message, {status: 403});

    sql_conn.ms_conn !== null ? await sql_conn.ms_conn.end() : await sql_conn.pg_conn?.end();

    return new Response("", {status: 200});
}

async function POST_check_old_db(req: Request) {
    let req_json: Record<string, unknown>;

    try {
        req_json = await req.json();
    } catch {
        return new Response("Bad Request", { status: 400 });
    }

    const db_type = typeof req_json.db_type === "string" ? req_json.db_type.trim() : "";
    const db_host = typeof req_json.db_host === "string" ? req_json.db_host.trim() : "";
    const db_port = typeof req_json.db_port === "number" ? req_json.db_port : Number(req_json.db_port ?? 0);
    const db_name = typeof req_json.db_name === "string" ? req_json.db_name.trim() : "";
    const db_user = typeof req_json.db_user === "string" ? req_json.db_user.trim() : "";
    const db_pass = typeof req_json.db_pass === "string" ? req_json.db_pass : "";

    if (["postgresql", "mysql"].includes(db_type)) {
        if (!db_host || !Number.isInteger(db_port) || db_port < 1 || db_port > 65535 || !db_name || !db_user) {
            return new Response("Bad Request", {status: 400});
        }
        
        const sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
        if (sql_conn.message === null) return new Response("Bad Request", {status: 400});

        try {
            await (
                sql_conn.ms_conn
                ? sql_conn.ms_conn.query("SELECT v FROM kasirku WHERE k = 'version' LIMIT 1")
                : sql_conn.pg_conn?.query("SELECT v FROM kasirku WHERE k = 'version' LIMIT 1")
            );
        } catch(_) {
            return new Response("", {status: 201});
        }
    }
    else if (db_type === "sqlite") {
        if (!await Bun.file("./database/kasirku.db").exists()) return new Response("", {status: 201});

        const db = new Database("./database/kasirku.db");
        if (!db.query("SELECT 1 FROM kasirku WHERE k = 'version' LIMIT 1").get()) {
            db.close();
            return new Response("", {status: 201});
        }
        db.close();
    }
    else return new Response("Bad Request", {status: 400});

    return new Response("", {status: 200});
}

async function POST_Setup(req: Request) {
    let req_json: Record<string, unknown>;

    try {
        req_json = await req.json();
    } catch {
        return new Response("Bad Request", { status: 400 });
    }

    const server_type = typeof req_json.server_type === "string" ? req_json.server_type.trim() : "";
    const server_port = typeof req_json.server_port === "number" ? req_json.server_port : Number(req_json.server_port ?? 0);
    const tls_upload = typeof req_json.tls_upload === "boolean" ? typeof req_json.tls_upload : null;
    const compile_html = typeof req_json.compile_html === "boolean" ? typeof req_json.compile_html : null;

    if (!server_type || !Number.isInteger(server_port) || server_port < 1 || server_port > 65535 || tls_upload === null || compile_html === null) {
        return new Response("Bad Request", { status: 400 });
    }

    const db_type = typeof req_json.db_type === "string" ? req_json.db_type.trim() : "";
    const db_host = typeof req_json.db_host === "string" ? req_json.db_host.trim() : "";
    const db_port = typeof req_json.db_port === "number" ? req_json.db_port : Number(req_json.db_port ?? 0);
    const db_name = typeof req_json.db_name === "string" ? req_json.db_name.trim() : "";
    const db_user = typeof req_json.db_user === "string" ? req_json.db_user.trim() : "";
    const db_pass = typeof req_json.db_pass === "string" ? req_json.db_pass : "";
    let db_new_migrate = typeof req_json.db_new_migrate === "boolean" ? req_json.db_new_migrate : null;

    if (!db_type) return new Response("Bad Request", { status: 400 });

    const store_name = typeof req_json.store_name === "string" ? req_json.store_name : "";
    const store_desc = typeof req_json.store_desc === "string" ? req_json.store_desc : "";
    const store_address = typeof req_json.store_address === "string" ? req_json.store_address : "";
    const store_phone_num = typeof req_json.store_phone_num === "string" ? req_json.store_phone_num : "";

    if (["postgresql", "mysql"].includes(db_type)) {
        if (!db_host || !Number.isInteger(db_port) || db_port < 1 || db_port > 65535 || !db_name || !db_user) {
            return new Response("Bad Request", {status: 400});
        }
        
        let sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
        if (sql_conn.message === null) return new Response("Bad Request", {status: 400});

        if (db_new_migrate) { // orang nya pengen migrate. tapi sebelum migrate, kita cek dulu. ada ga?
            try {
                await (
                    sql_conn.ms_conn
                    ? sql_conn.ms_conn.query("SELECT 1 FROM kasirku WHERE k = 'version' LIMIT 1")
                    : sql_conn.pg_conn?.query("SELECT 1 FROM kasirku WHERE k = 'version' LIMIT 1")
                );
            } catch(_) {
                db_new_migrate = false;
                // wah, ternyata gaada. ternyata dia pengen coba nipuk nih. kita switch ke false, wleeee
            }
        }

        let migrated_data: {
            kategori_barang: any[];
            barang: any[];
            barang_masuk: any[];
            penjualan: any[];
            penjualan_item: any[];
            pembukuan: any[];
            retur_barang: any[];
        } | null = null;

        if (sql_conn.ms_conn) {
            if (db_new_migrate) {
                try {
                    const [kategori_barang_rows] = await sql_conn.ms_conn.query("SELECT * FROM kategori_barang");
                    const [barang_rows] = await sql_conn.ms_conn.query("SELECT * FROM barang");
                    const [barang_masuk_rows] = await sql_conn.ms_conn.query("SELECT * FROM barang_masuk");
                    const [penjualan_rows] = await sql_conn.ms_conn.query("SELECT * FROM penjualan");
                    const [penjualan_item_rows] = await sql_conn.ms_conn.query("SELECT * FROM penjualan_item");
                    const [pembukuan_rows] = await sql_conn.ms_conn.query("SELECT * FROM pembukuan");
                    const [retur_barang_rows] = await sql_conn.ms_conn.query("SELECT * FROM retur_barang");

                    migrated_data = {
                        kategori_barang: kategori_barang_rows as unknown[],
                        barang: barang_rows as unknown[],
                        barang_masuk: barang_masuk_rows as unknown[],
                        penjualan: penjualan_rows as unknown[],
                        penjualan_item: penjualan_item_rows as unknown[],
                        pembukuan: pembukuan_rows as unknown[],
                        retur_barang: retur_barang_rows as unknown[],
                    };

                    console.log(migrated_data);
                } catch(e) {
                    db_new_migrate = false;
                }
                
                await sql_conn.ms_conn.end();
                sql_conn = await sql_connection(db_type, db_host, db_port, "", db_user, db_pass);
                await sql_conn.ms_conn?.query(`CREATE DATABASE "${db_name}"`);
                await sql_conn.ms_conn?.end();
                sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
            }

            const { drizzle } = await import("drizzle-orm/mysql2");
            const { migrate } = await import("drizzle-orm/mysql2/migrator");
            const db = drizzle(sql_conn.ms_conn!);
            await migrate(db, {
                migrationsFolder: "./database/migrations/postgresql",
            });

            if (db_new_migrate) {
                /*await sql_conn.ms_conn?.query("BEGIN");
                try {
                    await insert_rows_mysql(sql_conn.ms_conn!, "kategori_barang", migrated_data.kategori_barang);

                    await sql_conn.ms_conn?.query("COMMIT");
                } catch (error) {
                    await sql_conn.ms_conn?.query("ROLLBACK");
                    throw error;
                }*/
            }
        } else {
            if (db_new_migrate) {
                try {
                    const { rows: kategori_barang_rows } = await sql_conn.pg_conn!.query("SELECT * FROM kategori_barang");
                    const { rows: barang_rows } = await sql_conn.pg_conn!.query("SELECT * FROM barang");
                    const { rows: barang_masuk_rows } = await sql_conn.pg_conn!.query("SELECT * FROM barang_masuk");
                    const { rows: penjualan_rows } = await sql_conn.pg_conn!.query("SELECT * FROM penjualan");
                    const { rows: penjualan_item_rows } = await sql_conn.pg_conn!.query("SELECT * FROM penjualan_item");
                    const { rows: pembukuan_rows } = await sql_conn.pg_conn!.query("SELECT * FROM pembukuan");
                    const { rows: retur_barang_rows } = await sql_conn.pg_conn!.query("SELECT * FROM retur_barang");

                    migrated_data = {
                        kategori_barang: kategori_barang_rows,
                        barang: barang_rows,
                        barang_masuk: barang_masuk_rows,
                        penjualan: penjualan_rows,
                        penjualan_item: penjualan_item_rows,
                        pembukuan: pembukuan_rows,
                        retur_barang: retur_barang_rows,
                    };
                } catch(e) {
                    db_new_migrate = false;
                }
            
                await sql_conn.pg_conn?.end();
                sql_conn = await sql_connection(db_type, db_host, db_port, "", db_user, db_pass);
                await sql_conn.pg_conn?.query(`CREATE DATABASE "${db_name}"`);
                await sql_conn.pg_conn?.end();
                sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
            }

            const { drizzle } = await import("drizzle-orm/node-postgres");
            const { migrate } = await import("drizzle-orm/node-postgres/migrator");
            const db = drizzle(sql_conn.pg_conn!);
            await migrate(db, {
                migrationsFolder: "./database/migrations/postgresql",
            });

            if (db_new_migrate && migrated_data) {
                /*await sql_conn.pg_conn?.query("BEGIN");
                try {
                    await insert_rows_pg(sql_conn.pg_conn!, "kategori_barang", migrated_data.kategori_barang);

                    await sql_conn.pg_conn?.query("COMMIT");
                } catch (error) {
                    await sql_conn.pg_conn?.query("ROLLBACK");
                    throw error;
                }*/
            }
        }
    }
    else if (db_type === "sqlite") {

    }
    else return new Response("Bad Request", {status: 400});

    return new Response("", {status: 200});
}

async function stop_server() {
    if (!is_server_closed) {
        is_server_closed = true;

        console.log("[SETUP PAGE LOG] Stopping Server...");
        bun_serve.stop();
        console.log("[SETUP PAGE LOG] Server has been stopped!");
    }
}

export function setup_http_main() {
    console.log(`[SETUP PAGE LOG] HTTP Server running in port 80`);

    const fetch_handler = async (req: Request) => {
        const url = new URL(req.url);
        url.pathname = decodeURIComponent(url.pathname);

        if (req.method === "GET") {
            let pathname = url.pathname.replace(/\/+/g, "/");

            if (pathname === "/favicon.ico") return new Response(Bun.file("./html/favicon.ico"));
            if (!pathname.startsWith("/")) return Response.redirect(new URL("/", req.url), 302);

            if (pathname.endsWith("/")) pathname += "index.html";
            if (pathname.endsWith(".")) pathname = pathname.slice(0, -1) + ".html";
            if (!pathname.includes(".")) pathname += ".html";

            let file = Bun.file(`./src/setup/html${pathname}`);

            if (!await file.exists()) return new Response("Not Found", {status: 404});
            return new Response(file, {
                status: 200,
                headers: {
                    "Content-Type": mime_types[pathname.split(".").pop() || ""] || "application/octet-stream",
                    "X-Frame-Options": "DENY",
                    "X-Content-Type-Options": "nosniff",
                },
            });
        }
        else if (req.method === "POST") {
            switch(url.pathname) {
                case "/test_connection": {
                    return POST_TestConnection(req);
                }
                case "/setup": {
                    return POST_Setup(req);
                }
                default: {
                    return new Response("Not Found", {status: 404});
                }
            }
        }
        else return new Response("Bad Request", {status: 400});
    };

    bun_serve = Bun.serve({
        port: 80,
        fetch: fetch_handler,
        error(err: Error) {
            console.log(err);
            return new Response("Internal Server Error", {status: 500});
        }
    });
    
    process.on("SIGINT", async () => {await stop_server()});
    process.on("SIGTERM", async () => {await stop_server()});
}