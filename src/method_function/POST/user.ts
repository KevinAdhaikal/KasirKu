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
import { check_sql_is_duplicate_error, get_password_hash_only } from "../../utils/utils";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const username = <string>user_input.get("username");
    const full_name = <string>user_input.get("full_name");
    const password = <string>user_input.get("password");
    const role_id = Number(user_input.get("role_id"));

    if (
        !username || !full_name || !password || !role_id || isNaN(role_id) // kalo misalnya username, full_name, password dan role_id nya ga ada
        || password.length < 8 // kalo misalnya password nya kurang dari 8 length nya
        || !/^[a-z0-9_]+$/.test(username) // kalo username nya mengandung diluar a to z, 0 to 9 dan _
    ) return new Response("Bad Request", {status: 400});

    const now = Date.now();
    try {
        const passwordHash = get_password_hash_only(
            await Bun.password.hash(password, {
                algorithm: "argon2id",
                timeCost: global.ph_timecost,
                memoryCost: global.ph_memorycost,
            }),
        );
        
        await db
        .insertInto('users')
        .values({
            username,
            full_name,
            password_hash: passwordHash,
            role_id,
            created_ms: now,
            modified_ms: now
        })
        .execute();
    } catch (e) {
        if (check_sql_is_duplicate_error(e)) return new Response("1", {status: 403});
        console.log("Unexpected error in post_method.ts at /user:", e);
        return new Response("Internal Server Error", { status: 500 });
    }

    global.sse_clients.send_to_role(1, JSON.stringify({
        type: 1,
        code: "REFRESH_USERS"
    }))
    
    return new Response("", {status: 200});
}