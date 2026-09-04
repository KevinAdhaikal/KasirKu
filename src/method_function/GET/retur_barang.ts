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
import { getDb, getSchema } from "../../database/schema";
import { eq } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = getDb();
    const { roles, retur_barang, barang } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

    const user_input = url.searchParams;

    const tanggal_key = Number(user_input.get("tanggal_key"));
    if (isNaN(tanggal_key) || !tanggal_key) return new Response("Bad Reuqest", {status: 400});

    const id = Number(user_input.get("id"));
    let res;

    if (!isNaN(id) && id) {
        res = await db
        .select({
            nama_barang: barang.nama_barang,
            barcode_barang: barang.barcode_barang,
            deskripsi: retur_barang.deskripsi,
            jumlah_barang: retur_barang.jumlah_barang
        })
        .from(retur_barang)
        .innerJoin(barang, eq(barang.id, retur_barang.barang_id))
        .where(eq(retur_barang.id, id))
        .limit(1)
        .then((r: any) => r[0]);
    } else {
        res = await db
        .select({
            id: retur_barang.id,
            nama_barang: barang.nama_barang,
            deskripsi: retur_barang.deskripsi,
            jumlah_barang: retur_barang.jumlah_barang
        })
        .from(retur_barang)
        .innerJoin(barang, eq(barang.id, retur_barang.barang_id))
        .where(eq(retur_barang.tanggal_key, tanggal_key));
    }

    return new Response(JSON.stringify(res), {status: 200});
}
