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

import { sql } from "kysely";
import { global } from "../../global";
import { check_sql_is_duplicate_error } from "../../utils/utils";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403}); // you don't have a permission to do that.

    const user_input = new URLSearchParams(await req.text());

    const id = Number(user_input.get("id"));
    const new_role_name = <string>user_input.get("new_role_name");
    let new_permission_level = <null | number>Number(user_input.get("new_permission_level"));

    if (!id || isNaN(id) || !new_role_name || isNaN(<number>new_permission_level) || (<number>new_permission_level & global.permissions.ADMINISTRATOR)) return new Response("Bad Request", {status: 400});

    try {
        const role = await db
        .selectFrom('roles')
        .select('permission_level')
        .where('id', '=', id)
        .executeTakeFirst();

        if (!role) return new Response("Internal Server Error", { status: 500 });

        await db
        .updateTable('roles')
        .set({
            name: new_role_name,
            permission_level: id === 1 ? sql`permission_level` : (new_permission_level ?? sql`permission_level`),
            modified_ms: Date.now()
        })
        .where('id', '=', id)
        .execute();

    } catch (e) {
        if (check_sql_is_duplicate_error(e)) return new Response("1", {status: 403});
        console.log("An error occured in patch_method.ts at /role:", e);
        return new Response("Internal Server Error", { status: 500 });
    }

    global.sse_clients.send_to_role(1, JSON.stringify({
        type: 1,
        code: "REFRESH_RP"
    }))
    global.sse_clients.send_to_role(id, JSON.stringify({
        type: 1,
        code: "CHANGE_PROFILE"
    }));

    return new Response("", {status: 200});
}