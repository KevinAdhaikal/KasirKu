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

import { user_session } from "./user_session/user_session";
import { sse_server } from "./sse_server/sse_server";
import { rate_limit } from "./rate_limit/rate_limit";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const current_date = new Date()

export const global = {
    // date
    get date() {
        current_date.setTime(Date.now())
        return current_date
    },

    user_sessions: null as unknown as user_session,
    sse_clients: null as unknown as sse_server,

    // password hash variable
    ph_memorycost: 1024,
    ph_timecost: 2,
    ph_text: `$argon2id$v=19$m=1024,t=2,p=`,

    rate_limit: null as unknown as rate_limit,

    // Database (Drizzle instance — one of the three dialects)
    database: null as unknown as BaseSQLiteDatabase<any, any> | MySql2Database<any> | NodePgDatabase<any>,

    // static cache for file
    static_cache: new Map() as Map<string, {buffer: Uint8Array, last_modified: number}>,

    // config file
    config: {
        "listen_port": 443,
        "use_tls": true,
        "compile_html": false,
        "db_type": "" as "sqlite" | "mysql" | "postgresql",
        "db_name": "",
        "tls_key_path": "cert/cert.key",
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
        }
    } as Record<string, any>,

    // Permissions
    permissions: {
        ADMINISTRATOR: 1 << 0,
        MANAGE_BARANG: 1 << 1,
        KASIR: 1 << 2,
        MANAGE_PEMBUKUAN: 1 << 3,
        DASHBOARD: 1 << 4
    },

    method_cache: {} as Record<string, any>,

    default_svg_profile_img: `<?xml version="1.0" encoding="utf-8"?>
    <!-- Generator: Adobe Illustrator 15.1.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
        <!ENTITY st0 "fill:#B3B3B3;">
    ]>
    <svg version="1.1" id="Ebene_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
         width="50px" height="75px" viewBox="0 0 50 75" style="enable-background:new 0 0 50 75;" xml:space="preserve">
    <circle style="&st0;" cx="25" cy="16.726" r="16.725"/>
    <path style="&st0;" d="M49.998,75V53.872c0-8.497-6.889-15.385-15.385-15.385H15.384c-8.496,0-15.386,6.888-15.386,15.385V75H49.998
        z"/>
    </svg>`, // https://upload.wikimedia.org/wikipedia/commons/4/4b/User-Pict-Profil.svg
}
