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
import type { MySql2Database } from "drizzle-orm/mysql2";
import type * as schemaType from "./database/schema/mysql";

const current_date = new Date();

export const global = {
    // date
    get date() {
        current_date.setTime(Date.now());
        return current_date;
    },

    user_sessions: null as unknown as user_session,
    sse_clients: null as unknown as sse_server,

    // password hash variable
    ph_memorycost: 1024,
    ph_timecost: 2,
    ph_text: `$argon2id$v=19$m=1024,t=2,p=`,

    rate_limit: null as unknown as rate_limit,

    // Database (Drizzle instance)
    database: null as any,

    // Database Schema
    schema: null as any as typeof schemaType,

    // Permissions
    permissions: {
        ADMINISTRATOR: 1 << 0,
        MANAGE_BARANG: 1 << 1,
        KASIR: 1 << 2,
        MANAGE_PEMBUKUAN: 1 << 3,
        DASHBOARD: 1 << 4
    },

    method_cache: {} as Record<string, any>
};
