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
import { eq, lte } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = getDb();
    const { roles, barang } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.DASHBOARD))) return new Response("0", {status: 403});

    const res = await db
    .select({ nama_barang: barang.nama_barang })
    .from(barang)
    .where(lte(barang.stok_barang, 0));

    return new Response(JSON.stringify(res), {status: 200});
}
