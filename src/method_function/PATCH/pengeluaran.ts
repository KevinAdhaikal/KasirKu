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

import { eq, and } from "drizzle-orm";
import { global } from "../../global";
import { getSchema, getDb } from "../../database/schema";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = getDb();
    const { roles, pembukuan } = getSchema();
    const res_role = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1).then((r: any) => r[0]);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const id = Number(user_input.get("id"));
    const tanggal_key = Number(user_input.get("tanggal_key"));
    const deskripsi = <string>user_input.get("deskripsi");
    const nominal = Number(user_input.get("nominal"));

    if (isNaN(id) || isNaN(tanggal_key) || !tanggal_key || !id || !deskripsi || !nominal) return new Response("Bad Request", {status: 400});

    let res;
    try {
        res = await db
        .update(pembukuan)
        .set({
            deskripsi,
            jumlah_uang: nominal,
            modified_ms: Date.now()
        })
        .where(and(
            eq(pembukuan.id, id),
            eq(pembukuan.tanggal_key, tanggal_key),
            eq(pembukuan.tipe, 1)
        ))
        .execute();
    } catch(e) {
        console.log("Unexpected error in patch_method.ts at /pengeluaran:", e);
        return new Response("Internal Server Error", {status: 500});
    }

    if (res.changes > 0n) {
        global.sse_clients.broadcast(JSON.stringify({
            type: 5,
            code: "UPDATE_PENGELUARAN",
            data: {
                id,
                tanggal_key
            }
        }));
    }

    return new Response("", {status: 200});
}