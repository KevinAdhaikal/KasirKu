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
import { eq, and } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = getDb();
    const { roles, pembukuan } = getSchema();
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

    const user_input = url.searchParams;
    const tanggal_key = Number(user_input.get("tanggal_key"));
    const id = Number(user_input.get("id"));

    let res;
    if (!isNaN(id) && id) {
        res = await db
        .select()
        .from(pembukuan)
        .where(and(eq(pembukuan.tipe, 1), eq(pembukuan.id, id)))
        .limit(1)
        .then((r: any) => r[0]);
    } else {
        if (isNaN(tanggal_key)) return new Response("Bad Request", { status: 400 });
        
        res = await db
        .select()
        .from(pembukuan)
        .where(and(eq(pembukuan.tipe, 1), eq(pembukuan.tanggal_key, tanggal_key)));
    }

    return new Response(JSON.stringify(res), {status: 200});
}
