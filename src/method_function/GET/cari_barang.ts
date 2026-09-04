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
import { eq, or, like, gt, and } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = getDb();
    const { roles, barang } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

    const user_input = url.searchParams;

    const barang_name = <string>user_input.get("barang"); // nama barang and barcode barang
    const bm = <string>user_input.get("bm"); // apakah cari barang ini untuk barang masuk?
    if (!barang_name) return new Response("Bad Request", {status: 400});

    const searchCondition = or(
        eq(barang.barcode_barang, barang_name),
        like(barang.nama_barang, `%${barang_name}%`)
    );

    let res;
    if (bm) {
        res = await db
        .select()
        .from(barang)
        .where(searchCondition);
    } else {
        res = await db
        .select()
        .from(barang)
        .where(and(gt(barang.stok_barang, 0), searchCondition));
    }
    
    return new Response(JSON.stringify(res), {status: 200});
}
