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

import { global } from "../../global";
import { check_sql_is_duplicate_error } from "../../utils/utils";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const id = Number(user_input.get("id"));
    const nama_barang = <string>user_input.get("nama_barang");
    const stok_barang = Number(user_input.get("stok_barang"));
    const kategori_barang_id = Number(user_input.get("kategori_barang_id"));
    const harga_modal = Number(user_input.get("harga_modal"));
    const harga_jual = Number(user_input.get("harga_jual"));
    let barcode_barang = <string | null>user_input.get("barcode_barang");

    if (isNaN(id) || !id || !nama_barang || !stok_barang || isNaN(stok_barang) || isNaN(kategori_barang_id) || !kategori_barang_id || !harga_modal || !harga_jual) return new Response("Bad Request", {status: 400});
    if (!barcode_barang || !barcode_barang.length) barcode_barang = null;

    const now = Date.now();
    try {
        await db
        .updateTable('barang')
        .set({
            nama_barang,
            stok_barang,
            kategori_barang_id,
            harga_modal,
            harga_jual,
            barcode_barang,
            modified_ms: now
        })
        .where('id', '=', id)
        .execute();
    } catch(e) {
        if (check_sql_is_duplicate_error(e)) return new Response("1", {status: 403});
        console.log("An error occured in patch_method.ts at /barang:", e)
        return new Response("Internal Server Error", {status: 500});
    }
    
    global.sse_clients.broadcast(JSON.stringify({
        type: 2,
        code: "UPDATE_BARANG",
        data: {
            id,
            nama_barang,
            stok_barang,
            kategori_barang_id,
            harga_modal,
            harga_jual,
            barcode_barang,
            modified_ms: now
        }
    }));

    return new Response("", {status: 200});
}