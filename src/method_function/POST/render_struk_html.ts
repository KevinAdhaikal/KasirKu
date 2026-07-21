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

import { global } from "../../global";
import { render_template } from "../../utils/utils";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR))) return new Response("0", {status: 403});

    const res = await req.text();

    if (!res || res.length >= 65535) return new Response("Bad Request", {status: 400})
    const toko_res = await db
        .selectFrom("store_settings")
        .selectAll()
        .where("id", "=", 1)
    .executeTakeFirst();

    return new Response(render_template(res, {store: toko_res}), {status: 200});
}