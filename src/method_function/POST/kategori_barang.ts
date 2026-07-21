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
import { check_sql_is_duplicate_error } from "../../utils/utils";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const nama_kategori = <string>user_input.get("nama_kategori");

    if (!nama_kategori) return new Response("Bad Request", {status: 400});

    const now = Date.now();
    let last_row;
    try {
        last_row = await global.sql_dialect.insert_return_id(db, "kategori_barang", {
            nama_kategori,
            created_ms: now,
            modified_ms: now
        })
    } catch (e) {
        if (check_sql_is_duplicate_error(e)) return new Response("1", {status: 403});
        console.log("An error occured in post_method.ts at /kategori_barang:", e);
        return new Response("Internal Server Error", { status: 500 });
    }

    if (!last_row) return new Response("Internal Server Error", { status: 500 });

    global.sse_clients.broadcast(JSON.stringify({
        type: 3,
        code: "TAMBAH_KATEGORI",
        data: {
            id: last_row,
            nama_kategori
        }
    }));

    return new Response(JSON.stringify({
        id: last_row,
        nama_kategori
    }), {status: 200});
}