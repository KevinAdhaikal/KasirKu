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
import { and, eq, inArray } from "drizzle-orm";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = global.database;
    const { settings } = global.schema;

    const toko_settings = await db
        .select({
            key: settings.key,
            value: settings.value,
        })
        .from(settings)
        .where(
            and(
                eq(settings.section, "store"),
                inArray(settings.key, [
                    "name",
                    "desc",
                    "address",
                    "phone_num",
                ])
            )
        );

    return new Response(JSON.stringify({store: toko_settings}), {
        status: 200,
        headers: {
            "Content-Type": "application/json"
        }
    });
}