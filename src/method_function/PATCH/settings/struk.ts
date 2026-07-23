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

import { global } from "../../../global";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});
    
    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR))) return new Response("0", {status: 403});
    
    const user_input = await req.text();

    if (!user_input || user_input.length >= 65535) return new Response("Bad Request", {
        status: 400
    });
    
    await db
        .updateTable('struk_settings')
        .set({
            content: user_input ?? null,
            modified_ms: Date.now()
        })
        .where('id', '=', 1)
    .execute();

    global.sse_clients.broadcast(JSON.stringify({
        type: 8,
        code: "UPDATE_STRUK_SETTING",
        data: user_input ?? null
    }));

    return new Response("", {status: 200});
}