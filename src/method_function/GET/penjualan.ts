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
import { and, eq, gte, lte } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = global.database;
    const { roles, penjualan, users } = global.schema;
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(
        res_role.permission_level & (
            global.permissions.ADMINISTRATOR |
            global.permissions.MANAGE_PEMBUKUAN
        )
    )) return new Response("0", {status: 403});

    const user_input = url.searchParams;
    const tanggal_start = Number(user_input.get("tanggal_start"));
    const tanggal_end = Number(user_input.get("tanggal_end"));
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

    if (
        Number.isNaN(id) || !id
    ) {
        if (
            Number.isNaN(tanggal_start) || !tanggal_start ||
            Number.isNaN(tanggal_end) || !tanggal_end
        ) return new Response("Bad Request", { status: 400 });
        res = await baseQuery.where(
            and(
                gte(penjualan.tanggal_key, tanggal_start),
                lte(penjualan.tanggal_key, tanggal_end)
            )
        );
    } else {
        res = await baseQuery
            .where(eq(penjualan.id, id))
            .limit(1)
        .then((r: any) => r[0]);
    }

    return new Response(JSON.stringify(res), {status: 200});
}
