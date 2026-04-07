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

export default async function(req: Request, token: string) {
    const user_input = new URLSearchParams(await req.text());
    
    const username = user_input.get("username");
    const password = user_input.get("password");
    
    if (!username || !password) return new Response("Bad Request", {status: 400});
    
    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    
    const row = await db
    .selectFrom('users')
    .select(['id', 'password_hash', 'role_id'])
    .where('username', '=', username)
    .executeTakeFirst();
    
    if (!row) return new Response("Forbidden", { status: 403 });
    if (!Bun.password.verifySync(password, global.ph_text + row.password_hash)) return new Response("Forbidden", { status: 403 });
    
    const session_id = global.user_sessions.add(row.id, row.role_id);
    if (!session_id) return new Response("Internal Server Error", { status: 500 });
    
    return new Response(session_id, {
        status: 200,
        headers: {
            "set-cookie": `token=${session_id}; Path=/; HttpOnly; SameSite=Strict; Secure`
        }
    });
}