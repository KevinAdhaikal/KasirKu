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
import { get_password_hash_only } from "../../utils/utils";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});
    
    const user_input = new URLSearchParams(await req.text());
    
    const old_pass = <string>user_input.get("old_pass");
    const new_pass = <string>user_input.get("new_pass");
    
    if (!old_pass || !new_pass || new_pass.length < 8) return new Response("Bad Request", {status: 400});
                
    const db = getDb();
    const { users } = getSchema();
    
    const user = await db
    .select({ password_hash: users.password_hash })
    .from(users)
    .where(eq(users.id, user_info.user_id))
    .limit(1)
    .then((r: any) => r[0]);
    
    if (!user) return new Response("Internal Server Error", { status: 500 });
    if (!Bun.password.verifySync(old_pass, global.ph_text + user.password_hash)) return new Response("0", { status: 403 }); // incorrect old password
    
    try {
        const new_hash_pass = get_password_hash_only(
            Bun.password.hashSync(new_pass, {
                algorithm: "argon2id",
                timeCost: global.ph_timecost,
                memoryCost: global.ph_memorycost,
            }),
        );
        
        await db.update(users)
        .set({
            password_hash: new_hash_pass,
            modified_ms: Date.now()
        })
        .where(eq(users.id, user_info.user_id))
        .execute();
                    
        global.sse_clients.remove_by_user_id(user_info.user_id);
        global.user_sessions.revoke_all_by_userid(user_info.user_id);
        
        const token_gen = <string>global.user_sessions.add(user_info.user_id, user_info.role_id);
        
        return new Response(token_gen, {
            headers: {
                "set-cookie": `token=${token_gen}; Path=/; HttpOnly`
            }
        })
    } catch(e) {
        console.log("An error occured in patch_method.ts at /change_password:", e);
        return new Response("Internal Server Error", {status: 500}); 
    }
}