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

    let res_data;    const now = Date.now();
    const date = new Date(now);
    const tanggal_key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

    try {
        res_data = await db.transaction().execute(async (trx) => {
            await trx.updateTable("barang")
            .set({
                stok_barang: sql`stok_barang - ${jumlah_barang}`
            })
            .where("id", "=", barang_id)
            .execute();
            
            const last_row = await global.sql_dialect.insert_return_id(trx, "retur_barang", {
                tanggal_key,
                barang_id,
                deskripsi,
                jumlah_barang,
                created_ms: now,
                modified_ms: now
            });

            const res_barang = await db.selectFrom("barang").select(["stok_barang", "nama_barang"]).where("id", "=", barang_id).executeTakeFirst();
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