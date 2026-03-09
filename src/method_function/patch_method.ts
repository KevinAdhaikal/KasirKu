import { global } from "../global";
import { bigint_safe, bigint_to_buffer, check_image_type, get_password_hash_only } from "../utils/utils";

export async function patch_method(req: Request, url: URL) {
    const token = <string>req.headers.get("token");

    switch(url.pathname) {
        case "/barang": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const nama_barang = <string>user_input.get("nama_barang");
            const stok_barang = Number(user_input.get("stok_barang"));
            const kategori_barang_id = Number(user_input.get("kategori_barang_id"));
            const harga_modal = bigint_safe(user_input.get("harga_modal"));
            const harga_jual = bigint_safe(user_input.get("harga_jual"));
            let barcode_barang = <string | null>user_input.get("barcode_barang");

            if (isNaN(id) || !id || !nama_barang || !stok_barang || isNaN(stok_barang) || isNaN(kategori_barang_id) || !kategori_barang_id || !harga_modal || !harga_jual) return new Response("Bad Request", {status: 400});
            if (!barcode_barang || !barcode_barang.length) barcode_barang = null;
            
            try {
                db.run("UPDATE barang SET nama_barang = ?, stok_barang = ?, kategori_barang_id = ?, harga_modal = ?, harga_jual = ?, barcode_barang = ?, modified_ms = ? WHERE id = ?", [
                    nama_barang,
                    stok_barang,
                    kategori_barang_id,
                    bigint_to_buffer(harga_modal),
                    bigint_to_buffer(harga_jual),
                    barcode_barang,
                    Date.now(),
                    id
                ])
            } catch(e) {
                console.log("An error occured in patch_method.ts at /barang:", e)
                return new Response("Internal Server Error", {status: 500});
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 2,
                code: "UPDATE_BARANG",
                data: {
                    id
                }
            }));

            return new Response("", {status: 200});
        }
        case "/kategori_barang": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const nama_kategori = <string>user_input.get("nama_kategori");

            if (isNaN(id) || !id || !nama_kategori) return new Response("Bad Request", {status: 400});

            try {
                db.run("UPDATE kategori_barang SET nama_kategori = ?, modified_ms = ? WHERE id = ?", [
                    nama_kategori,
                    Date.now(),
                    id
                ]);
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
                }
            }));

            return new Response("", {status: 200});
        }
        case "/pengeluaran": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const tanggal_key = Number(user_input.get("tanggal_key"));
            const deskripsi = <string>user_input.get("deskripsi");
            const nominal = bigint_safe(user_input.get("nominal"));

            if (isNaN(id) || isNaN(tanggal_key) || !tanggal_key || !id || !deskripsi || !nominal) return new Response("Bad Request", {status: 400});

            let res = null;
            try {
                res = db.run("UPDATE pembukuan SET deskripsi = ?, jumlah_uang = ? WHERE id = ? AND tanggal_key = ? AND tipe = 1", [
                    deskripsi,
                    bigint_to_buffer(nominal),
                    id,
                    tanggal_key
                ]);
            } catch(e) {
                console.log("Unexpected error in patch_method.ts at /pengeluaran:", e);
                return new Response("Internal Server Error", {status: 500});
            }

            if (res.changes) global.sse_clients.broadcast(JSON.stringify({
                type: 5,
                code: "UPDATE_PENGELUARAN",
                data: {
                    id,
                    tanggal_key
                }
            }));

            return new Response("", {status: 200});
        }
        case "/profile": { // change current user profile
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const user_input = new URLSearchParams(await req.text());

            const new_username = <string>user_input.get("new_username");
            const new_full_name = <string>user_input.get("new_full_name");
            let new_profile_img = <Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike> | string>user_input.get("new_profile_img");

            if (!new_username || !new_full_name) return new Response("Bad Request", {status: 400});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});

            let get_type = null;
            let body_res = "";
            let header_res: any = {}

            const stmt = db.prepare("SELECT username FROM users WHERE id = ?");
            const username = stmt.get(user_info.user_id);
            stmt.finalize();
            if (!username) return new Response("Internal Server Error", {status: 500});

            try {
                if (new_profile_img) {
                    new_profile_img = Buffer.from(<string>new_profile_img, "base64");
                    get_type = check_image_type(new_profile_img);
                    if (!get_type) return new Response("Bad Request", {status: 400});

                    db.run("UPDATE users SET username = ?, full_name = ?, profile_img = ?, modified_ms = ? WHERE id = ?", [
                        new_username,
                        new_full_name,
                        `/profile_img/${user_info.user_id}.${get_type}`,
                        Date.now(),
                        user_info.user_id
                    ]);

                    Bun.file(`html/profile_img/${user_info.user_id}.${get_type}`).write(new_profile_img);
                } else {
                    db.run("UPDATE users SET username = ?, full_name = ?, modified_ms = ? WHERE id = ?", [
                        new_username,
                        new_full_name,
                        Date.now(),
                        user_info.user_id
                    ]);
                }
            } catch(e: any) {
                if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return new Response("1", {status: 403})
                console.log("An error occured in patch_method.ts at /profile:", e);
                return new Response("Internal Server Error", {status: 500});
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
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});
            
            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const new_username = <string>user_input.get("new_username");
            const new_full_name = <string>user_input.get("new_full_name");
            const new_role_id = <number>Number(user_input.get("new_role_id"));
            let new_password = <string | null>user_input.get("new_password");

            if (!id || isNaN(id) || !new_username || !new_full_name) return new Response("Bad Request", {status: 400});
            if (id === user_info.user_id) return new Response("1", {status: 403}); // you can't edit your own user account!
            if (id === 1) return new Response("2", {status: 403}); // you can't edit default account!

            if (new_password) new_password = get_password_hash_only(Bun.password.hashSync(new_password, {
                    algorithm: "argon2id",
                    timeCost: global.ph_timecost,
                    memoryCost: global.ph_memorycost,
                }),
            );
            else new_password = null;
            
            stmt = db.prepare("SELECT role_id FROM users WHERE id = ?");
            let res = stmt.get(id) as {role_id: number};
            if (!res) return new Response("Not Found", {status: 404});

            try {
                db.run("UPDATE users SET username = ?, full_name = ?, role_id = ?, password_hash = COALESCE(?, password_hash), modified_ms = ? WHERE id = ?", [
                    new_username,
                    new_full_name,
                    new_role_id,
                    new_password,
                    Date.now(),
                    id
                ]);
            } catch(e: any) {
                if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return new Response("3", {status: 403}); // username is already exists!
                console.log("Unexpected error in patch_method.ts at /user:", e);
                return new Response("Internal Server Error", {status: 500});
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

            if (!old_pass || !new_pass) return new Response("Bad Request", {status: 400});
            
            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});

            const stmt = db.prepare("SELECT password_hash FROM users WHERE id = ?");
            const res = stmt.get(user_info.user_id) as {password_hash: string};
            stmt.finalize();
            if (!res) return new Response("Internal Server Error", {status: 500});

            if (!Bun.password.verifySync(old_pass, global.ph_text + res.password_hash)) return new Response("0", {status: 403}); // incorrect old password

            try {
                db.run("UPDATE users SET password_hash = ?, modified_ms = ? WHERE id = ?", [
                    get_password_hash_only(
                        Bun.password.hashSync(new_pass, {
                            algorithm: "argon2id",
                            timeCost: global.ph_timecost,
                            memoryCost: global.ph_memorycost,
                        }),
                    ),
                    Date.now(),
                    user_info.user_id
                ]);
                
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
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403}); // you don't have a permission to do that.

            const user_input = new URLSearchParams(await req.text());

            const id = Number(user_input.get("id"));
            const new_role_name = <string>user_input.get("new_role_name");
            let new_permission_level = <null | number>Number(user_input.get("new_permission_level"));

            if (!id || isNaN(id) || !new_role_name || isNaN(<number>new_permission_level) || (<number>new_permission_level & global.permissions.ADMINISTRATOR)) return new Response("Bad Request", {status: 400});

            try {
                const stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res = stmt.get(id) as {permission_level: number};

                if (!res) return new Response("Internal Server Error", {status: 500});

                if (id === 1) new_permission_level = null;
                
                db.run("UPDATE roles SET name = ?, permission_level = COALESCE(?, permission_level), modified_ms = ? WHERE id = ?", [
                    new_role_name,
                    new_permission_level,
                    Date.now(),
                    id
                ]);
            } catch(e: any) {
                if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return new Response("1", {status: 403})
                console.log("An error occured in patch_method.ts at /role:", e);
                return new Response("Internal Server Error", {status: 500});
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