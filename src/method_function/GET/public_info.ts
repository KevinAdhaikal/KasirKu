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

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});

    const toko_res = await db
        .selectFrom("store_settings")
        .selectAll()
        .where("id", "=", 1)
    .executeTakeFirst();

    return new Response(JSON.stringify({store: toko_res}), {status: 200});
}