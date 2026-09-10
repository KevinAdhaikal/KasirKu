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

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = getDb();
    const schema = getSchema();
    const [res_role] = await db.select({permission_level: schema.roles.permission_level}).from(schema.roles).where(eq(schema.roles.id, user_info.role_id)).limit(1);
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
        const [result] = await db.insert(schema.pembukuan).values({
            tipe: 1,
            deskripsi,
            jumlah_uang: nominal,
            tanggal_key: date_now,
            created_ms: now,
            modified_ms: now
        }).returning();
        last_row = Number(result.id);
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