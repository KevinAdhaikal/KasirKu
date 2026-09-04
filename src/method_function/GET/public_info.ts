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
    const { store_settings } = getSchema();

    const [toko_res] = await db
        .select()
        .from(store_settings)
        .where(eq(store_settings.id, 1))
        .limit(1);

    return new Response(JSON.stringify({store: toko_res}), {status: 200});
}
