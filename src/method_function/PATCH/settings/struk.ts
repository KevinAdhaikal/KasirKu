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

import { eq } from "drizzle-orm";
import { global } from "../../../global";
import { getSchema, getDb } from "../../../database/schema";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});
    
    const db = getDb();
    const { roles, struk_settings } = getSchema();
    const res_role = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1).then((r: any) => r[0]);
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR))) return new Response("0", {status: 403});
    
    const user_input = await req.text();

    if (!user_input || user_input.length >= 65535) return new Response("Bad Request", {
        status: 400
    });
    
    await db
        .update(struk_settings)
        .set({
            content: user_input ?? null,
            modified_ms: Date.now()
        })
        .where(eq(struk_settings.id, 1))
    .execute();

    global.sse_clients.broadcast(JSON.stringify({
        type: 8,
        code: "UPDATE_STRUK_SETTING",
        data: user_input ?? null
    }));

    return new Response("", {status: 200});
}