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

import { eq, sql } from "drizzle-orm";
import { global } from "../../global";
import { getSchema, getDb } from "../../database/schema";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});
            
    const db = getDb();
    const schema = getSchema();
    const [res_role] = await db.select({permission_level: schema.roles.permission_level}).from(schema.roles).where(eq(schema.roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());
            
    const id = Number(user_input.get("id"));
    const tanggal_key = Number(user_input.get("tanggal_key"));

    if (isNaN(id) || isNaN(tanggal_key) || !id || !tanggal_key) return new Response("", {status: 400});

    try {
        const res = await db
        .select({id: schema.pembukuan.id})
        .from(schema.pembukuan)
        .where(eq(schema.pembukuan.id, id))
        .where(eq(schema.pembukuan.tanggal_key, tanggal_key))
        .where(eq(schema.pembukuan.tipe, 1))
        .limit(1);

        if (res.length > 0) {
            await db
            .delete(schema.pembukuan)
            .where(eq(schema.pembukuan.id, id))
            .where(eq(schema.pembukuan.tanggal_key, tanggal_key))
            .where(eq(schema.pembukuan.tipe, 1))
            .execute();

            global.sse_clients.broadcast(JSON.stringify({
                type: 5,
                code: "DELETE_PENGELUARAN",
                data: {
                    id,
                    tanggal_key
                }
            }));
        }
    } catch(e) {
        console.log("An error occured in delete_method.ts at /pengeluaran:", e);
        return new Response("Internal Server Error", {status: 500});
    }
            
    return new Response("", {status: 200});
}
