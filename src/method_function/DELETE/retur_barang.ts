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

    if (isNaN(id) || !id || isNaN(tanggal_key) || !tanggal_key) return new Response("Bad Request", {status: 400});

    const [res] = await db
    .select({jumlah_barang: schema.retur_barang.jumlah_barang, barang_id: schema.retur_barang.barang_id})
    .from(schema.retur_barang)
    .where(eq(schema.retur_barang.id, id))
    .where(eq(schema.retur_barang.tanggal_key, tanggal_key))
    .limit(1);

    if (!res) return new Response("Not Found", {status: 404});

    let stok_barang;
    try {
        stok_barang = await db.transaction(async (trx: any) => {
            await trx.update(schema.barang)
            .set({
                stok_barang: sql`stok_barang + ${res.jumlah_barang}`
            })
            .where(eq(schema.barang.id, res.barang_id))
            .execute();
            
            await trx.delete(schema.retur_barang).where(eq(schema.retur_barang.id, id)).where(eq(schema.retur_barang.tanggal_key, tanggal_key)).execute();
            const [row] = await trx.select({stok_barang: schema.barang.stok_barang}).from(schema.barang).where(eq(schema.barang.id, res.barang_id)).limit(1);
            return row?.stok_barang;
        });
    } catch(e) {
        return new Response("Internal Server Error", {status: 500});
    }

    global.sse_clients.broadcast(JSON.stringify({
        type: 7,
        code: "DELETE_RETUR_BARANG",
        data: {
            id,
            tanggal_key
        }
    }));
    global.sse_clients.broadcast(JSON.stringify({
        type: 2,
        code: "UPDATE_BARANG",
        data: {
            id: res.barang_id,
            stok_barang
        }
    }))

    return new Response("", {status: 200});
}
