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

import { sql, eq } from "drizzle-orm";
import { global } from "../../global";
import { user_session_interface } from "../../user_session/user_session";
import { getDb, getSchema } from "../../database/schema";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = getDb();
    const { roles } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);

    if (!res_role) return new Response("Internal Server Error", {status: 500});
    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.DASHBOARD))) return new Response("0", {status: 403}); 
    
    const user_input = url.searchParams;
    const tanggal_key = Number(user_input.get("tanggal_key")); 
    if (isNaN(tanggal_key) || !tanggal_key) return new Response("Bad Request", {status: 400}); 
    
    const [res] = await db
    .select({
        total_barang: sql<number>`(SELECT SUM(total_barang) FROM penjualan WHERE tanggal_key = ${tanggal_key})`.as('total_barang'),
        total_harga_modal: sql<number>`(SELECT SUM(total_harga_modal) FROM penjualan WHERE tanggal_key = ${tanggal_key})`.as('total_harga_modal'),
        total_harga_jual: sql<number>`(SELECT SUM(total_harga_jual) FROM penjualan WHERE tanggal_key = ${tanggal_key})`.as('total_harga_jual'),
        jumlah_uang: sql<number>`(SELECT SUM(jumlah_uang) FROM pembukuan WHERE tanggal_key = ${tanggal_key} AND tipe = 1)`.as('jumlah_uang')
    })
    .from(sql`(SELECT 1)`);
    
    return new Response(JSON.stringify(res), {status: 200});
}
