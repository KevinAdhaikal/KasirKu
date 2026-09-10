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
    const { roles, barang, kategori_barang } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});
    
    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});
    
    const user_input = url.searchParams;
    
    const id = Number(user_input.get("id"));
                    
    let res;
    const baseQuery = db
    .select({
        id: barang.id,
        nama_barang: barang.nama_barang,
        stok_barang: barang.stok_barang,
        kategori_barang_id: barang.kategori_barang_id,
        harga_modal: barang.harga_modal,
        harga_jual: barang.harga_jual,
        barcode_barang: barang.barcode_barang,
        created_ms: barang.created_ms,
        modified_ms: barang.modified_ms,
        nama_kategori: kategori_barang.nama_kategori
    })
    .from(barang)
    .innerJoin(kategori_barang, eq(barang.kategori_barang_id, kategori_barang.id));

    if (isNaN(id) || !id) res = await baseQuery;
    else res = await baseQuery.where(eq(barang.id, id)).limit(1).then((r: any) => r[0]);
    
    return new Response(JSON.stringify(res), {status: 200});
}
