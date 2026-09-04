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
    const { roles, penjualan, users } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

    const user_input = url.searchParams;
    const tanggal_key = Number(user_input.get("tanggal_key"));
    const id = Number(user_input.get("id"));

    let res;
    const baseQuery = db
    .select({
        id: penjualan.id,
        kasir_id: penjualan.kasir_id,
        no_struk: penjualan.no_struk,
        total_barang: penjualan.total_barang,
        total_harga_modal: penjualan.total_harga_modal,
        total_harga_jual: penjualan.total_harga_jual,
        tanggal_key: penjualan.tanggal_key,
        created_ms: penjualan.created_ms,
        modified_ms: penjualan.modified_ms,
        nama_kasir: users.full_name
    })
    .from(penjualan)
    .leftJoin(users, eq(users.id, penjualan.kasir_id));

    if (isNaN(id) || !id) {
        if (isNaN(tanggal_key)) return new Response("Bad Request", { status: 400 });
        res = await baseQuery
        .where(eq(penjualan.tanggal_key, tanggal_key));
    } else {
        res = await baseQuery
        .where(eq(penjualan.id, id))
        .limit(1)
        .then((r: any) => r[0]);
    }

    return new Response(JSON.stringify(res), {status: 200});
}
