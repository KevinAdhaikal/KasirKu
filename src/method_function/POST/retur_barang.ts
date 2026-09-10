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

    const barang_id = Number(user_input.get("barang_id"));
    const deskripsi = user_input.get("deskripsi");
    const jumlah_barang = Number(user_input.get("jumlah_barang"));

    if (
        isNaN(barang_id) || !barang_id
        || !deskripsi
        || isNaN(jumlah_barang) || !jumlah_barang
    ) return new Response("Bad Request", {status: 400});

    let res_data;
    
    const date = global.date;
    const now = date.getTime();
    const tanggal_key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

    try {
        res_data = await db.transaction(async (trx: any) => {
            await trx.update(schema.barang)
            .set({
                stok_barang: sql`stok_barang - ${jumlah_barang}`
            })
            .where(eq(schema.barang.id, barang_id));
            
            const [returResult] = await trx.insert(schema.retur_barang).values({
                tanggal_key,
                barang_id,
                deskripsi,
                jumlah_barang,
                created_ms: now,
                modified_ms: now
            }).returning();
            const last_row = Number(returResult.id);

            const [res_barang] = await db.select({stok_barang: schema.barang.stok_barang, nama_barang: schema.barang.nama_barang}).from(schema.barang).where(eq(schema.barang.id, barang_id)).limit(1);
            return {
                last_row,
                nama_barang: res_barang?.nama_barang,
                stok_barang: res_barang?.stok_barang
            };
        })
    } catch(e) {
        console.log("An error occured in post_method.ts at /retur_barang:", e);
        return new Response("Internal Server Error", {status: 500});
    }

    global.sse_clients.broadcast(JSON.stringify({
        type: 7,
        code: "TAMBAH_RETUR_BARANG",
        data: {
            id: res_data.last_row,
            tanggal_key,
            nama_barang: res_data.nama_barang,
            deskripsi,
            jumlah_barang,
            created_ms: now,
            modified_ms: now
        }
    }));

    global.sse_clients.broadcast(JSON.stringify({
        type: 2, 
        code: "UPDATE_BARANG",
        data: {
            id: barang_id,
            stok_barang: res_data.stok_barang
        }
    }))

    return new Response("", {status: 200});
}