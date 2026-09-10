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
import { check_image_type, check_sql_is_duplicate_error } from "../../utils/utils";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const user_input = new URLSearchParams(await req.text());

    const new_username = <string>user_input.get("new_username");
    const new_full_name = <string>user_input.get("new_full_name");
    let new_profile_img = <Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike> | string>user_input.get("new_profile_img");

    if (
        !new_username || !new_full_name // kalo username dan full name nya kosong
        || !/^[a-z0-9_]+$/.test(new_username) // kalo username nya mengandung diluar a to z, 0 to 9 dan _
    ) return new Response("Bad Request", {status: 400});

    const db = getDb();
    const { users } = getSchema();

    let body_res = "";
    let header_res: any = {}

    const user = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, user_info.user_id))
    .limit(1)
    .then((r: any) => r[0]);

    if (!user) return new Response("Internal Server Error", { status: 500 });

    try {
        const update_data: any = {
            username: new_username,
            full_name: new_full_name,
            modified_ms: Date.now()
        };

        if (new_profile_img) {
            if (new_profile_img === "null") update_data.profile_img = "";
            else {
                const img_buffer = Buffer.from(<string>new_profile_img, "base64");
                const get_type = check_image_type(img_buffer);
                if (!get_type) return new Response("Bad Request", { status: 400 });

                const file_path_img = `profile_img/${user_info.user_id}.${get_type}`;
                update_data.profile_img = `/${file_path_img}`;

                await Bun.write(file_path_img, img_buffer);
            }
        }
                
        await db.update(users)
        .set(update_data)
        .where(eq(users.id, user_info.user_id))
        .execute();
    } catch (e) {
        if (check_sql_is_duplicate_error(e)) return new Response("1", {status: 403});
        console.log("An error occured in patch_method.ts at /profile:", e);
        return new Response("Internal Server Error", { status: 500 });
    }

    global.sse_clients.send_to_user(user_info.user_id, JSON.stringify({
        type: 1,
        code: "CHANGE_PROFILE"
    }));
    global.sse_clients.send_to_role(1, JSON.stringify({
        type: 1,
        code: "REFRESH_USERS"
    }));

    return new Response(body_res, {status: 200, headers: header_res});
}