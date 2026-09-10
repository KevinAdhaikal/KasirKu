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
import { getSchema, getDb } from "../../database/schema";
import { check_sql_is_duplicate_error } from "../../utils/utils";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = getDb();
    const { roles, kategori_barang } = getSchema();
    const res_role = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1).then((r: any) => r[0]);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const id = Number(user_input.get("id"));
    const nama_kategori = <string>user_input.get("nama_kategori");

    if (isNaN(id) || !id || !nama_kategori) return new Response("Bad Request", {status: 400});

    try {
        await db
        .update(kategori_barang)
        .set({
            nama_kategori,
            modified_ms: Date.now()
        })
        .where(eq(kategori_barang.id, id))
        .execute();
    } catch(e) {
        if (check_sql_is_duplicate_error(e)) return new Response("1", {status: 403});
        console.log("An error occured in patch_method.ts at /kategori_barang:", e)
        return new Response("Internal Server Error", {status: 500});
    }

    global.sse_clients.broadcast(JSON.stringify({
        type: 3,
        code: "UPDATE_KATEGORI",
        data: {
            id,
            nama_kategori
        }
    }));

    return new Response("", {status: 200});
}