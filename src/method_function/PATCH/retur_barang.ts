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
    const { roles, retur_barang, barang } = getSchema();
    const res_role = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1).then((r: any) => r[0]);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const id = Number(user_input.get("id"));
    const tanggal_key = Number(user_input.get("tanggal_key"));
    const deskripsi = user_input.get("deskripsi");
    const jumlah_barang = Number(user_input.get("jumlah_barang"));

    if (
        isNaN(id) || !id
        || isNaN(tanggal_key) || !tanggal_key
        || !deskripsi
        || isNaN(jumlah_barang) || !jumlah_barang
    ) return new Response("Bad Request", {status: 400});

    const now = Date.now();

    const res = await db.select({ jumlah_barang: retur_barang.jumlah_barang, barang_id: retur_barang.barang_id })
    .from(retur_barang)
    .where(eq(retur_barang.id, id))
    .where(eq(retur_barang.tanggal_key, tanggal_key))
    .limit(1)
    .then((r: any) => r[0]);


    if (!res) return new Response("Not Found", {status: 404});

    let stok_barang;
    try {
        stok_barang = await db.transaction(async (trx: any) => {
            await trx
            .update(retur_barang)
            .set({
                deskripsi,
                jumlah_barang,
                modified_ms: now
            })
            .where(eq(retur_barang.id, id))
            .where(eq(retur_barang.tanggal_key, tanggal_key))
            .execute();

            await trx
            .update(barang)
            .set({
                stok_barang: sql`${barang.stok_barang} + ${res.jumlah_barang - jumlah_barang}`
            })
            .where(eq(barang.id, res.barang_id))
            .execute();

            return (await trx.select({ stok_barang: barang.stok_barang }).from(barang).where(eq(barang.id, res.barang_id)).limit(1).then((r: any) => r[0]))?.stok_barang;
        });
    } catch(e) {
        console.log("An error occured in patch_method.ts at /retur_barang:", e);
        return new Response("Internal Server Error", {status: 500});
    }

    global.sse_clients.broadcast(JSON.stringify({
        type: 7,
        code: "UPDATE_RETUR_BARANG",
        data: {
            id,
            tanggal_key,
            deskripsi,
            jumlah_barang,
            modified_ms: now
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