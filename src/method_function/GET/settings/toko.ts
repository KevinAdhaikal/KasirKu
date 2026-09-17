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

import { user_session_interface } from "../../../user_session/user_session";
import { global } from "../../../global";
import { and, eq, inArray } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = global.database;
    const { roles, settings } = global.schema;
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});
    
    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR))) return new Response("0", {status: 403});
    
    const rows = await db
        .select({
            key: settings.key,
            value: settings.value,
        })
        .from(settings)
        .where(
            and(
                eq(settings.section, "store"),
                inArray(settings.key, [
                    "name",
                    "desc",
                    "address",
                    "phone_num",
                    "email"
                ])
            )
        );

    const res = Object.fromEntries(
        rows.map((row: {key: string, value: any}) => [row.key, row.value])
    );
    
    return new Response(JSON.stringify(res), {status: 200});
}
