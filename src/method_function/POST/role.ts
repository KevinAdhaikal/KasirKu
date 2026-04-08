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

export default async function(req: Request, token: string) {
    // add role (administrator permission only)
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const role_name = <string>user_input.get("role_name");
    const permission_level = Number(user_input.get("permission_level"));

    if (!role_name || isNaN(permission_level) || (permission_level & global.permissions.ADMINISTRATOR)) return new Response("Bad Request", {status: 400});

    const now = Date.now();
    try {
        await db
        .insertInto('roles')
        .values({
            name: role_name,
            permission_level,
            created_ms: now,
            modified_ms: now
        })
        .execute();
    } catch (e: any) {
        if (e.code === "ER_DUP_ENTRY" || e.errno === 1062) return new Response("1", { status: 403 });
        
        console.log("An error occured in post_method.ts at /role:", e);
        return new Response("Internal Server Error", { status: 500 });
    }
    
    global.sse_clients.send_to_role(1, JSON.stringify({
        type: 1,
        code: "REFRESH_RP"
    }))
    
    return new Response("", {status: 200})
}