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

import { and, eq } from "drizzle-orm";
import { global } from "../../../global";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});
    
    const db = global.database;
    const { roles, settings } = global.schema;
    const res_role = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1).then((r: any) => r[0]);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR))) return new Response("0", {status: 403});

    const { enabled, content } = await req.json();

    if (enabled) {
        if (!content || !content.length) return new Response("Bad Request", { status: 400 });
        await db
            .update(settings)
            .set({
                value: content ?? "",
                modified_ms: Date.now(),
            })
            .where(
                and(
                    eq(settings.section, "receipt"),
                    eq(settings.key, "content"),
                )
            );
    }

    await db
        .update(settings)
        .set({
            value: String(enabled),
            modified_ms: Date.now(),
        })
        .where(
            and(
                eq(settings.section, "receipt"),
                eq(settings.key, "enabled"),
            )
        );

    global.sse_clients.broadcast(JSON.stringify({
        type: 8,
        code: "UPDATE_STRUK_SETTING",
        data: {
            enabled, content
        }
    }));

    return new Response("", {status: 200});
}