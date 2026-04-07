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

import { user_session_interface } from "../../user_session/user_session";
import { global } from "../../global";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

    const user_input = url.searchParams;

    const tanggal_key = Number(user_input.get("tanggal_key"));
    if (isNaN(tanggal_key) || !tanggal_key) return new Response("Bad Request", {status: 400});

    let res;
    const id = Number(user_input.get("id"));
    if (!isNaN(id) && id) {
        res = await db
        .selectFrom('barang_masuk as bm')
        .innerJoin('barang as b', 'b.id', 'bm.barang_id')
        .select([
            'b.nama_barang',
            'bm.deskripsi',
            'bm.jumlah_barang'
        ])
        .where('bm.id', '=', id)
        .where('bm.tanggal_key', '=', tanggal_key)
        .executeTakeFirst();
    } else {
        res = await db
        .selectFrom('barang_masuk as bm')
        .innerJoin('barang as b', 'b.id', 'bm.barang_id')
        .select([
            'bm.id',
            'b.nama_barang',
            'bm.deskripsi',
            'bm.jumlah_barang'
        ])
        .where('bm.tanggal_key', '=', tanggal_key)
        .execute();
    }
    

    return new Response(JSON.stringify(res), {status: 200});
}