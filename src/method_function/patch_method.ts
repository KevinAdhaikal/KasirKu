import { sql } from "kysely";
import { global } from "../global";
import { check_image_type, get_password_hash_only } from "../utils/utils";

export async function patch_method(req: Request, url: URL) {
    const token = <string>req.headers.get("token");

    switch(url.pathname) {
        case "/barang": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const nama_barang = <string>user_input.get("nama_barang");
            const stok_barang = Number(user_input.get("stok_barang"));
            const kategori_barang_id = Number(user_input.get("kategori_barang_id"));
            const harga_modal = Number(user_input.get("harga_modal"));
            const harga_jual = Number(user_input.get("harga_jual"));
            let barcode_barang = <string | null>user_input.get("barcode_barang");

            if (isNaN(id) || !id || !nama_barang || !stok_barang || isNaN(stok_barang) || isNaN(kategori_barang_id) || !kategori_barang_id || !harga_modal || !harga_jual) return new Response("Bad Request", {status: 400});
            if (!barcode_barang || !barcode_barang.length) barcode_barang = null;
            
            try {
                await db
                .updateTable('barang')
                .set({
                    nama_barang,
                    stok_barang,
                    kategori_barang_id,
                    harga_modal,
                    harga_jual,
                    barcode_barang,
                    modified_ms: Date.now()
                })
                .where('id', '=', id)
                .execute();
            } catch(e) {
                console.log("An error occured in patch_method.ts at /barang:", e)
                return new Response("Internal Server Error", {status: 500});
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 2,
                code: "UPDATE_BARANG",
                data: {
                    id,
                    kategori_barang_id
                }
            }));

            return new Response("", {status: 200});
        }
        case "/kategori_barang": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const nama_kategori = <string>user_input.get("nama_kategori");

            if (isNaN(id) || !id || !nama_kategori) return new Response("Bad Request", {status: 400});

            try {
                await db
                .updateTable('kategori_barang')
                .set({
                    nama_kategori,
                    modified_ms: Date.now()
                })
                .where('id', '=', id)
                .execute();
            } catch(e: any) {
                if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return new Response("1", {status: 403});
                console.log("An error occured in patch_method.ts at /kategori_barang:", e)
                return new Response("Internal Server Error", {status: 500});
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 3,
                code: "UPDATE_KATEGORI",
                data: {
                    id,
                    nama_kategori
                }
            }));

            return new Response("", {status: 200});
        }
        case "/pengeluaran": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const tanggal_key = Number(user_input.get("tanggal_key"));
            const deskripsi = <string>user_input.get("deskripsi");
            const nominal = Number(user_input.get("nominal"));

            if (isNaN(id) || isNaN(tanggal_key) || !tanggal_key || !id || !deskripsi || !nominal) return new Response("Bad Request", {status: 400});

            let res;
            try {
                res = await db
                .updateTable('pembukuan')
                .set({
                    deskripsi,
                    jumlah_uang: nominal,
                    modified_ms: Date.now()
                })
                .where('id', '=', id)
                .where('tanggal_key', '=', tanggal_key)
                .where('tipe', '=', 1)
                .executeTakeFirst();
            } catch(e) {
                console.log("Unexpected error in patch_method.ts at /pengeluaran:", e);
                return new Response("Internal Server Error", {status: 500});
            }

            if (res.numUpdatedRows > 0n) {
                global.sse_clients.broadcast(JSON.stringify({
                    type: 5,
                    code: "UPDATE_PENGELUARAN",
                    data: {
                        id,
                        tanggal_key
                    }
                }));
            }

            return new Response("", {status: 200});
        }
        case "/profile": { // change current user profile
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

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});

            let body_res = "";
            let header_res: any = {}

            const user = await db
            .selectFrom('users')
            .select('username')
            .where('id', '=', user_info.user_id)
            .executeTakeFirst();

            if (!user) return new Response("Internal Server Error", { status: 500 });

            try {
                const update_data: any = {
                    username: new_username,
                    full_name: new_full_name,
                    modified_ms: Date.now()
                };

                if (new_profile_img) {
                    const img_buffer = Buffer.from(<string>new_profile_img, "base64");
                    const get_type = check_image_type(img_buffer);
                    if (!get_type) return new Response("Bad Request", { status: 400 });

                    const file_path_img = `profile_img/${user_info.user_id}.${get_type}`;
                    update_data.profile_img = `/${file_path_img}`;

                    await db.updateTable('users')
                    .set(update_data)
                    .where('id', '=', user_info.user_id)
                    .execute();

                    await Bun.write(file_path_img, img_buffer);
                } else {
                    await db.updateTable('users')
                    .set(update_data)
                    .where('id', '=', user_info.user_id)
                    .execute();
                }
            } catch (e: any) {
                if (e.code === "ER_DUP_ENTRY" || e.errno === 1062) return new Response("1", { status: 403 });
                
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
        case "/user": { // change user (administrator permission only)
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});
            
            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const new_username = <string>user_input.get("new_username");
            const new_full_name = <string>user_input.get("new_full_name");
            const new_role_id = <number>Number(user_input.get("new_role_id"));
            let new_password = <string | null>user_input.get("new_password");

            if (
                !id || isNaN(id) || !new_username || !new_full_name
                || !/^[a-z0-9_]+$/.test(new_username) // kalo username nya mengandung diluar a to z, 0 to 9 dan _
            ) return new Response("Bad Request", {status: 400});
            if (id === user_info.user_id) return new Response("1", {status: 403}); // you can't edit your own user account!
            if (id === 1) return new Response("2", {status: 403}); // you can't edit default account!

            if (new_password && new_password.length >= 8) new_password = get_password_hash_only(Bun.password.hashSync(new_password, {
                    algorithm: "argon2id",
                    timeCost: global.ph_timecost,
                    memoryCost: global.ph_memorycost,
                }),
            );
            else new_password = null;
            
            const res = await db
            .selectFrom('users')
            .select('role_id')
            .where('id', '=', id)
            .executeTakeFirst();

            if (!res) return new Response("Not Found", { status: 404 });

            try {
                await db
                .updateTable('users')
                .set({
                    username: new_username,
                    full_name: new_full_name,
                    role_id: new_role_id,
                    password_hash: new_password 
                        ? new_password 
                        : sql`password_hash`, 
                    modified_ms: Date.now()
                })
                .where('id', '=', id)
                .execute();
            } catch (e: any) {
                if (e.code === "ER_DUP_ENTRY" || e.errno === 1062) return new Response("3", { status: 403 });
                console.log("Unexpected error in patch_method.ts at /user:", e);
                return new Response("Internal Server Error", { status: 500 });
            }

            global.sse_clients.send_to_role(1, JSON.stringify({
                type: 1,
                code: "REFRESH_USERS"
            }))

            if (new_password) {
                global.sse_clients.remove_by_user_id(id);
                global.user_sessions.revoke_all_by_userid(id);
            }
            else {
                if (new_role_id !== res.role_id) global.user_sessions.change_role(id, new_role_id);
                global.sse_clients.send_to_user(id, JSON.stringify({
                    type: 1,
                    code: "CHANGE_PROFILE"
                }));
            }

            return new Response("", {status: 200});
        }
        case "/change_password": { // change current user password
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const user_input = new URLSearchParams(await req.text());

            const old_pass = <string>user_input.get("old_pass");
            const new_pass = <string>user_input.get("new_pass");

            if (!old_pass || !new_pass || new_pass.length < 8) return new Response("Bad Request", {status: 400});
            
            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});

            const user = await db
            .selectFrom('users')
            .select('password_hash')
            .where('id', '=', user_info.user_id)
            .executeTakeFirst();

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

                await db.updateTable('users')
                .set({
                    password_hash: new_hash_pass,
                    modified_ms: Date.now()
                })
                .where('id', '=', user_info.user_id)
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
        case "/role": { // change role name & permission (administrator permission only)
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403}); // you don't have a permission to do that.

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const new_role_name = <string>user_input.get("new_role_name");
            let new_permission_level = <null | number>Number(user_input.get("new_permission_level"));

            if (!id || isNaN(id) || !new_role_name || isNaN(<number>new_permission_level) || (<number>new_permission_level & global.permissions.ADMINISTRATOR)) return new Response("Bad Request", {status: 400});

            try {
                const role = await db
                .selectFrom('roles')
                .select('permission_level')
                .where('id', '=', id)
                .executeTakeFirst();

                if (!role) return new Response("Internal Server Error", { status: 500 });

                await db
                .updateTable('roles')
                .set({
                    name: new_role_name,
                    permission_level: id === 1 ? sql`permission_level` : (new_permission_level ?? sql`permission_level`),
                    modified_ms: Date.now()
                })
                .where('id', '=', id)
                .execute();

            } catch (e: any) {
                if (e.code === "ER_DUP_ENTRY" || e.errno === 1062) return new Response("1", { status: 403 });
                
                console.log("An error occured in patch_method.ts at /role:", e);
                return new Response("Internal Server Error", { status: 500 });
            }

            global.sse_clients.send_to_role(1, JSON.stringify({
                type: 1,
                code: "REFRESH_RP"
            }))
            global.sse_clients.send_to_role(id, JSON.stringify({
                type: 1,
                code: "CHANGE_PROFILE"
            }));

            return new Response("", {status: 200});
        }
        default: {
            return new Response("Not Found", {status: 404});
        }
    }
}