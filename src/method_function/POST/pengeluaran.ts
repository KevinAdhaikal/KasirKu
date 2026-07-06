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

import { global } from "../../global";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const deskripsi = <string>user_input.get("deskripsi");
    const nominal = Number(user_input.get("nominal"));

    if (!deskripsi || !nominal) return new Response("Bad Reuqest", {status: 400});
    
    const date = global.date;
    const now = date.getTime();
    const date_now = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    let last_row;

    try {
        last_row = await global.sql_dialect.insert_return_id(db, "pembukuan", {
            tipe: 1,
            deskripsi,
            jumlah_uang: nominal,
            tanggal_key: date_now,
            created_ms: now,
            modified_ms: now
        });
    } catch (e) {
        console.log("Unexpected error in post_method.ts at /pengeluaran:", e);
        return new Response("Internal Server Error", { status: 500 });
    }

    global.sse_clients.broadcast(JSON.stringify({
        type: 5,
        code: "TAMBAH_PENGELUARAN",
        data: {
            id: last_row,
            tanggal_key: date_now
        }
    }));

    return new Response("", {status: 200});
}