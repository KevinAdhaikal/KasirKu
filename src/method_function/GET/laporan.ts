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
import { eq, gte, lte, and } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = getDb();
    const { roles, penjualan, pembukuan } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});
                
    const user_input = url.searchParams;
                
    const tanggal_start = Number(user_input.get("tanggal_start"));
    const tanggal_end = Number(user_input.get("tanggal_end"));
    
    if (isNaN(tanggal_start) || isNaN(tanggal_end) || !tanggal_start || !tanggal_end) return new Response("Bad Request", {status: 400});

    const penjualan_res = await db
    .select()
    .from(penjualan)
    .where(and(gte(penjualan.tanggal_key, tanggal_start), lte(penjualan.tanggal_key, tanggal_end)));

    const pengeluaran_res = await db
    .select()
    .from(pembukuan)
    .where(and(eq(pembukuan.tipe, 1), gte(pembukuan.tanggal_key, tanggal_start), lte(pembukuan.tanggal_key, tanggal_end)));

    return new Response(JSON.stringify({
        penjualan: penjualan_res, pengeluaran: pengeluaran_res
    }), {status: 200});
}
