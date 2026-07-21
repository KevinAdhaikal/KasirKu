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
    
    const user_input = new URLSearchParams(await req.text());

    const nama_toko = user_input.get("nama_toko");
    const deskripsi_toko = user_input.get("deskripsi_toko");
    const alamat_toko = user_input.get("alamat_toko");
    const telepon_toko = user_input.get("telepon_toko");
    const email_toko = user_input.get("email_toko");

    const phoneRegex = /^[0-9+\-\s()]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (telepon_toko && !phoneRegex.test(telepon_toko.trim())) {
        return new Response("Bad Request", {
            status: 400
        });
    }
    if (email_toko && !emailRegex.test(email_toko.trim())) {
        return new Response("Bad Request", {
            status: 400
        });
    }

    await db
        .updateTable('store_settings')
        .set({
            name: nama_toko,
            description: deskripsi_toko,
            address: alamat_toko,
            no_phone: telepon_toko,
            email: email_toko,
            modified_ms: Date.now()
        })
        .where('id', '=', 1)
    .execute();

    global.sse_clients.broadcast(JSON.stringify({
        type: 8,
        code: "UPDATE_TOKO_SETTING",
        data: {
            nama_toko,
            deskripsi_toko,
            alamat_toko,
            telepon_toko,
            email_toko
        }
    }));

    return new Response("", {status: 200});
}