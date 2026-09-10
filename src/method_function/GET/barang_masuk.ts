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
import { eq, and } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = getDb();
    const { roles, barang_masuk, barang } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

    const user_input = url.searchParams;

    const tanggal_key = Number(user_input.get("tanggal_key"));
    if (isNaN(tanggal_key) || !tanggal_key) return new Response("Bad Request", {status: 400});

    let res;
    const id = Number(user_input.get("id"));
    if (!isNaN(id) && id) {
        res = await db
        .select({
            nama_barang: barang.nama_barang,
            deskripsi: barang_masuk.deskripsi,
            jumlah_barang: barang_masuk.jumlah_barang
        })
        .from(barang_masuk)
        .innerJoin(barang, eq(barang.id, barang_masuk.barang_id))
        .where(and(eq(barang_masuk.id, id), eq(barang_masuk.tanggal_key, tanggal_key)))
        .limit(1)
        .then((r: any) => r[0]);
    } else {
        res = await db
        .select({
            id: barang_masuk.id,
            nama_barang: barang.nama_barang,
            deskripsi: barang_masuk.deskripsi,
            jumlah_barang: barang_masuk.jumlah_barang
        })
        .from(barang_masuk)
        .innerJoin(barang, eq(barang.id, barang_masuk.barang_id))
        .where(eq(barang_masuk.tanggal_key, tanggal_key));
    }
    

    return new Response(JSON.stringify(res), {status: 200});
}
