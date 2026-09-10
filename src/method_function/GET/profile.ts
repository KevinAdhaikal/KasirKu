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
import { getDb, getSchema } from "../../database/schema";
import { eq } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = getDb();
    const { users, roles } = getSchema();

    const [res] = await db
    .select({
        id: users.id,
        username: users.username,
        full_name: users.full_name,
        profile_img: users.profile_img,
        modified_ms: users.modified_ms,
        created_ms: users.created_ms,
        role_name: roles.name,
        permission_level: roles.permission_level
    })
    .from(users)
    .innerJoin(roles, eq(users.role_id, roles.id))
    .where(eq(users.id, user_info.user_id))
    .limit(1);

    return new Response(JSON.stringify(res), {status: 200});
}
