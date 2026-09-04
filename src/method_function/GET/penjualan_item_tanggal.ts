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
import { sql, eq, and, gte, lte } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = getDb();
    const { roles, penjualan_item } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    const user_input = url.searchParams;
    const tanggal_start = Number(user_input.get("tanggal_start"));
    const tanggal_end = Number(user_input.get("tanggal_end"));

    if (isNaN(tanggal_start) || isNaN(tanggal_end) || !tanggal_start || !tanggal_end) return new Response("Bad Request", {status: 400});

    const res = await db
    .select({
        nama_barang: penjualan_item.nama_barang,
        jumlah: sql<number>`sum(${penjualan_item.jumlah})`.as('jumlah')
    })
    .from(penjualan_item)
    .where(and(gte(penjualan_item.tanggal_key, tanggal_start), lte(penjualan_item.tanggal_key, tanggal_end)))
    .groupBy(penjualan_item.nama_barang);

    return new Response(JSON.stringify(res), {status: 200});
}
