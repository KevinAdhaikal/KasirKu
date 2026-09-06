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
import { Connection } from "mysql2/promise";
import { Client } from "pg";
import { Database } from "bun:sqlite";

// routes
import { POST_Test_Connection } from "./routes/POST_Test_Connection";
import { POST_Check_Old_DB } from "./routes/POST_Check_Old_DB";
import { POST_Setup_DB } from "./routes/POST_Setup.DB";
import { POST_Setup_Server } from "./routes/POST_Setup_Server";
import { POST_Setup_Store } from "./routes/POST_Setup_Store";
import { POST_Setup_Final } from "./routes/POST_Setup_Final";
import { POST_Setup_Admin } from "./routes/POST_Setup_Admin";

let is_server_closed = false;
let bun_serve: any;

export const current_config = {
    "listen_port": 443,
    "use_tls": true,
    "compile_html": false,
    "db_type": "" as "sqlite" | "mysql" | "postgresql",
    "db_name": "",
    "tls_key_path": "cert/key.pem",
    "tls_cert_path": "cert/cert.pem",
    "postgresql": {
        "host": "localhost",
        "port": 5432,
        "user": "postgres",
        "password": ""
    },
    "mysql": {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": ""
    },
    "temp": {
        "pg_conn": null as unknown as Client,
        "ms_conn": null as unknown as Connection,
        "sqlite_conn": null as unknown as Database,
        "setup_done": [0, 0, 0, 0]
    }
};

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

export async function stop_server() {
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
                    return POST_Test_Connection(req);
                }
                case "/check_old_db": {
                    return POST_Check_Old_DB(req);
                }
                case "/setup_server": {
                    return POST_Setup_Server(req);
                }
                case "/setup_db": {
                    return POST_Setup_DB(req);
                }
                case "/setup_store": {
                    return POST_Setup_Store(req);
                }
                case "/setup_admin": {
                    return POST_Setup_Admin(req);
                }
                case "/setup_final": {
                    return POST_Setup_Final(req);
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