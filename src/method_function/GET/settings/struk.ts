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
import { and, eq, or } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = global.database;
    const { roles, settings } = global.schema;
    const [res_role] = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});
    
    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR))) return new Response("0", {status: 403});

    const res = await db
        .select({
            key: settings.key,
            value: settings.value
        })
        .from(settings)
        .where(
            or(
                and(
                    eq(settings.section, "receipt"),
                    eq(settings.key, "content")
                ),
                and(
                    eq(settings.section, "receipt"),
                    eq(settings.key, "enabled")
                )
            )
        );

    const res_struk = Object.fromEntries(
        res.map((item: { key: string, value: string }) => [item.key, item.value])
    );

    return new Response(JSON.stringify(res_struk), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
}
