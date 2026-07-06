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

import { sql } from "kysely";
import { global } from "../../global";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});
    
    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});
    
    if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});
    
    const user_input = new URLSearchParams(await req.text());
    
    const barang_id = Number(user_input.get("barang_id"));
    const deskripsi = <string>user_input.get("deskripsi");
    const jumlah_barang = Number(user_input.get("jumlah_barang"));
                
    if (isNaN(barang_id) || !barang_id || !deskripsi || isNaN(jumlah_barang) || !jumlah_barang) return new Response("Bad Request", {status: 400});
    
    const res = await db
    .selectFrom('barang')
    .select(['id', 'nama_barang', 'stok_barang'])
    .where('id', '=', barang_id)
    .executeTakeFirst();
    
    if (!res) return new Response("1", {status: 404});
    
    const date = global.date
    const now = date.getTime();
    const tanggal_key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    let last_row;
    
    try {
        last_row = await db.transaction().execute(async (trx) => {
            const last_row = await global.sql_dialect.insert_return_id(trx, "barang_masuk", {
                tanggal_key,
                barang_id,
                deskripsi,
                jumlah_barang,
                created_ms: now,
                modified_ms: now
            });
            
            await trx
            .updateTable('barang')
            .set({
                stok_barang: sql`stok_barang + ${jumlah_barang}`
            })
            .where('id', '=', barang_id)
            .execute();
            
            return last_row;
        });
    } catch (e) {
        console.log("An error occured in post_method.ts at /barang_masuk:", e);
        return new Response("Internal Server Error", { status: 500 });
    }
    
    global.sse_clients.broadcast(JSON.stringify({
        type: 6,
        code: "TAMBAH_BARANG_MASUK",
        data: {
            id: last_row,
            nama_barang: res.nama_barang,
            deskripsi,
            jumlah_barang: jumlah_barang,
            tanggal_key,
            barang_id: res.id,
            stok_barang: res.stok_barang + jumlah_barang
        }
    }));
    
    return new Response("", {status: 200});
}