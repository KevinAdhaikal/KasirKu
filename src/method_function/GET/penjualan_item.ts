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
    const { roles, penjualan_item } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

    const user_input = url.searchParams;
    const penjualan_id = Number(user_input.get("penjualan_id"));

    if (isNaN(penjualan_id)) return new Response("Bad Request", {status: 400});

    const res = await db
    .select({
        jumlah: penjualan_item.jumlah,
        harga_jual: penjualan_item.harga_jual,
        total_harga_jual: penjualan_item.total_harga_jual,
        tanggal_key: penjualan_item.tanggal_key,
        created_ms: penjualan_item.created_ms,
        modified_ms: penjualan_item.modified_ms,
        nama_barang: penjualan_item.nama_barang
    })
    .from(penjualan_item)
    .where(eq(penjualan_item.penjualan_id, penjualan_id));

    return new Response(JSON.stringify(res), {status: 200});
}
