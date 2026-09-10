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
import { global } from "../../global";
import { getSchema, getDb } from "../../database/schema";
import { check_sql_is_duplicate_error, get_password_hash_only } from "../../utils/utils";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = getDb();
    const { roles, users } = getSchema();
    const res_role = await db.select({ permission_level: roles.permission_level }).from(roles).where(eq(roles.id, user_info.role_id)).limit(1).then((r: any) => r[0]);
    if (!res_role) return new Response("Internal Server Error", {status: 500});
            
    if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const id = Number(user_input.get("id"));
    const new_username = <string>user_input.get("new_username");
    const new_full_name = <string>user_input.get("new_full_name");
    const new_role_id = <number>Number(user_input.get("new_role_id"));
    let new_password = <string | null>user_input.get("new_password");

    if (
        !id || isNaN(id) || !new_username || !new_full_name
        || !/^[a-z0-9_]+$/.test(new_username) // kalo username nya mengandung diluar a to z, 0 to 9 dan _
    ) return new Response("Bad Request", {status: 400});
    if (id === user_info.user_id) return new Response("1", {status: 403}); // you can't edit your own user account!
    if (id === 1) return new Response("2", {status: 403}); // you can't edit default account!

    if (new_password && new_password.length >= 8) new_password = get_password_hash_only(Bun.password.hashSync(new_password, {
            algorithm: "argon2id",
            timeCost: global.ph_timecost,
            memoryCost: global.ph_memorycost,
        }),
    );
    else new_password = null;
            
    const res = await db
    .select({ role_id: users.role_id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then((r: any) => r[0]);

    if (!res) return new Response("Not Found", { status: 404 });

    try {
        const updateData: any = {
            username: new_username,
            full_name: new_full_name,
            role_id: new_role_id,
            modified_ms: Date.now()
        };
        if (new_password) updateData.password_hash = new_password;

        await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .execute();
    } catch (e) {
        if (check_sql_is_duplicate_error(e)) return new Response("3", {status: 403});
        console.log("Unexpected error in patch_method.ts at /user:", e);
        return new Response("Internal Server Error", { status: 500 });
    }

    global.sse_clients.send_to_role(1, JSON.stringify({
        type: 1,
        code: "REFRESH_USERS"
    }))

    if (new_password) {
        global.sse_clients.remove_by_user_id(id);
        global.user_sessions.revoke_all_by_userid(id);
    }
    else {
        if (new_role_id !== res.role_id) global.user_sessions.change_role(id, new_role_id);
        global.sse_clients.send_to_user(id, JSON.stringify({
            type: 1,
            code: "CHANGE_PROFILE"
        }));
    }

    return new Response("", {status: 200});
}