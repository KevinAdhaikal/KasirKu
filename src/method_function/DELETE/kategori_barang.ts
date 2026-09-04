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

import { eq, sql } from "drizzle-orm";
import { global } from "../../global";
import { getSchema, getDb } from "../../database/schema";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});
    
    const db = getDb();
    const schema = getSchema();
    const [res_role] = await db.select({permission_level: schema.roles.permission_level}).from(schema.roles).where(eq(schema.roles.id, user_info.role_id)).limit(1);
    if (!res_role) return new Response("Internal Server Error", {status: 500});
    
    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});
    
    const user_input = new URLSearchParams(await req.text());
    
    const id = Number(user_input.get("id"));
    const recursive = user_input.get("recursive");
    
    if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});
    if (id === 1) return new Response("1", {status: 403});
    if (!recursive) {
        const [res] = await db
        .select({exists: sql`1`.as('exists')})
        .from(schema.barang)
        .where(eq(schema.barang.kategori_barang_id, id))
        .limit(1);
        
        if (res) return new Response("2", { status: 403 });
    }
    
    try {
        await db
        .delete(schema.kategori_barang)
        .where(eq(schema.kategori_barang.id, id))
        .execute();
    } catch (e) {
        console.log("An error occured in delete_method.ts at /kategori_barang:", e);
        return new Response("Internal Server Error", { status: 500 });
    }
    
    global.sse_clients.broadcast(JSON.stringify({
        type: 3,
        code: "DELETE_KATEGORI",
        data: {
            id
        }
    }));
    return new Response("", {status: 200});
}
