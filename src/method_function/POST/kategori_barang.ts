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

import { eq } from "drizzle-orm";
import { global } from "../../global";
import { check_sql_is_duplicate_error } from "../../utils/utils";
import { getSchema, getDb } from "../../database/schema";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = getDb();
    const schema = getSchema();
    const [res_role] = await db.select({permission_level: schema.roles.permission_level}).from(schema.roles).where(eq(schema.roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const nama_kategori = <string>user_input.get("nama_kategori");

    if (!nama_kategori) return new Response("Bad Request", {status: 400});

    const now = Date.now();
    let last_row;
    try {
        const [result] = await db.insert(schema.kategori_barang).values({
            nama_kategori,
            created_ms: now,
            modified_ms: now
        }).returning();
        last_row = Number(result.id);
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