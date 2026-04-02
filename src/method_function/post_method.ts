import { global } from "../global";
import * as Bun from "bun";
import { get_password_hash_only } from "../utils/utils";
import { sql } from "kysely";

// server-side
export async function post_method(req: Request, url: URL) {
    const token = <string>req.headers.get("token");

    switch(url.pathname) {
        case "/login": { // login user account
            const user_input = new URLSearchParams(await req.text());

            const username = user_input.get("username");
            const password = user_input.get("password");

            if (!username || !password) return new Response("Bad Requesst", {status: 400});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});

            const row = await db
            .selectFrom('users')
            .select(['id', 'password_hash', 'role_id'])
            .where('username', '=', username)
            .executeTakeFirst();

            if (!row) return new Response("Forbidden", { status: 403 });
            if (!Bun.password.verifySync(password, global.ph_text + row.password_hash)) return new Response("Forbidden", { status: 403 });

            const session_id = global.user_sessions.add(row.id, row.role_id);
            if (!session_id) return new Response("Internal Server Error", { status: 500 });

            return new Response(session_id, {
                status: 200,
                headers: {
                    "set-cookie": `token=${session_id}; Path=/; HttpOnly; SameSite=Strict; Secure`
                }
            });
        }
        case "/barang": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const nama_barang = <string>user_input.get("nama_barang");
            const stok_barang = Number(user_input.get("stok_barang"));
            const kategori_barang_id = Number(user_input.get("kategori_barang_id"));
            const harga_modal = Number(user_input.get("harga_modal"));
            const harga_jual = Number(user_input.get("harga_jual"));
            let barcode_barang = <string | null>user_input.get("barcode_barang");
            
            if (!nama_barang || isNaN(kategori_barang_id) || !stok_barang || isNaN(stok_barang) || !kategori_barang_id || !harga_modal || !harga_jual) return new Response("Bad Request", {status: 400});
            if (!barcode_barang || !barcode_barang.length) barcode_barang = null;

            const now = Date.now();
            let last_row;
            try {
                const result = await db
                .insertInto('barang')
                .values({
                    nama_barang,
                    stok_barang,
                    kategori_barang_id,
                    harga_modal,
                    harga_jual,
                    barcode_barang,
                    created_ms: now,
                    modified_ms: now
                })
                .executeTakeFirstOrThrow();

                last_row = Number(result.insertId);
            } catch (e) {
                console.log("An error occured in post_method.ts at /barang:", e);
                return new Response("Internal Server Error", { status: 500 });
            }

            if (!last_row) return new Response("Internal Server Error", { status: 500 });

            global.sse_clients.broadcast(JSON.stringify({
                type: 2,
                code: "TAMBAH_BARANG",
                data: {
                    id: last_row,
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

            const nama_kategori = <string>user_input.get("nama_kategori");

            if (!nama_kategori) return new Response("Bad Request", {status: 400});

            const now = Date.now();
            let last_row;
            try {
                const result = await db
                .insertInto('kategori_barang')
                .values({
                    nama_kategori,
                    created_ms: now,
                    modified_ms: now
                })
                .executeTakeFirstOrThrow();

                last_row = Number(result.insertId);
            } catch (e: any) {
                if (e.code === "ER_DUP_ENTRY" || e.errno === 1062) return new Response("1", { status: 403 });
                console.log("An error occured in post_method.ts at /kategori_barang:", e);
                return new Response("Internal Server Error", { status: 500 });
            }

            if (!last_row) return new Response("Internal Server Error", { status: 500 });

            global.sse_clients.broadcast(JSON.stringify({
                type: 3,
                code: "TAMBAH_KATEGORI",
                data: {
                    id: last_row,
                    nama_kategori
                }
            }));

            return new Response(JSON.stringify({
                id: last_row,
                nama_kategori
            }), {status: 200});
        }
        case "/masuk_ke_pembukuan": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.KASIR))) return new Response("0", {status: 403});

            const user_data = await req.json();
            const items = user_data.items as [{
                id: number,
                jumlah_barang: number,
                harga_modal: number,
                harga_jual: number,
                nama_barang: string
            }];

            if (!Array.isArray(items)) return new Response("Bad Request", {status: 400});
            const now = Date.now();
            const date_now = global.date.getFullYear() * 10000 + (global.date.getMonth() + 1) * 100 + global.date.getDate();

            let total_barang = 0;
            let total_harga_modal = 0;
            let total_harga_jual = 0;
            
            for (const data of items) {
                total_barang += data.jumlah_barang;
                
                const barang = await db
                .selectFrom('barang')
                .select(['nama_barang', 'stok_barang', 'harga_modal', 'harga_jual'])
                .where('id', '=', data.id)
                .executeTakeFirst();

                if (!barang) return new Response("Not Found", { status: 404 });
                if ((barang.stok_barang - data.jumlah_barang) < 0) return new Response("1", { status: 403 });
                
                data.harga_modal = barang.harga_modal;
                data.harga_jual = barang.harga_jual;
                data.nama_barang = barang.nama_barang;
                
                total_harga_modal += data.harga_modal * data.jumlah_barang;
                total_harga_jual += data.harga_jual * data.jumlah_barang;
            }

            try {
                await db.transaction().execute(async (trx) => {
                    const penjualan = await trx
                    .insertInto('penjualan')
                    .values({
                        total_barang,
                        total_harga_modal,
                        total_harga_jual,
                        tanggal_key: date_now,
                        created_ms: now,
                        modified_ms: now
                    })
                    .executeTakeFirstOrThrow();

                    const last_row = Number(penjualan.insertId);

                    await trx
                    .insertInto('pembukuan')
                    .values({
                        tipe: 0,
                        jumlah_uang: total_harga_jual,
                        referensi_id: last_row,
                        tanggal_key: date_now,
                        created_ms: now,
                        modified_ms: now
                    })
                    .execute();

                    for (const e of items) {
                        await trx
                        .insertInto('penjualan_item')
                        .values({
                            penjualan_id: last_row,
                            barang_id: e.id,
                            nama_barang: e.nama_barang,
                            jumlah: e.jumlah_barang,
                            harga_modal: e.harga_modal * e.jumlah_barang,
                            harga_jual: e.harga_jual * e.jumlah_barang,
                            tanggal_key: date_now,
                            created_ms: now,
                            modified_ms: now
                        })
                        .execute();

                        // Update stok barang pake logic CASE WHEN
                        await trx
                        .updateTable('barang')
                        .set({
                            stok_barang: sql`CASE 
                                WHEN stok_barang - ${e.jumlah_barang} < 0 THEN 0 
                                ELSE stok_barang - ${e.jumlah_barang} 
                            END`
                        })
                        .where('id', '=', e.id)
                        .execute();
                    }
                });
            } catch (e) {
                console.log("An error occured in post_method.ts at /masuk_ke_pembukuan:", e);
                return new Response("Internal Server Error", { status: 500 });
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 4,
                code: "TAMBAH_PENJUALAN",
                data: {
                    items,
                    tanggal_key: date_now
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

            const deskripsi = <string>user_input.get("deskripsi");
            const nominal = Number(user_input.get("nominal"));

            if (!deskripsi || !nominal) return new Response("Bad Reuqest", {status: 400});

            const now = Date.now();
            const date_now = global.date.getFullYear() * 10000 + (global.date.getMonth() + 1) * 100 + global.date.getDate();
            let last_row;

            try {
                const result = await db
                .insertInto('pembukuan')
                .values({
                    tipe: 1,
                    deskripsi,
                    jumlah_uang: nominal,
                    tanggal_key: date_now,
                    created_ms: now,
                    modified_ms: now
                })
                .executeTakeFirst();

                last_row = Number(result.insertId);
            } catch (e) {
                console.log("Unexpected error in post_method.ts at /pengeluaran:", e);
                return new Response("Internal Server Error", { status: 500 });
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 5,
                code: "TAMBAH_PENGELUARAN",
                data: {
                    id: last_row,
                    tanggal_key: date_now
                }
            }));

            return new Response("", {status: 200});
        }
        case "/barang_masuk": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const barang_id = Number(user_input.get("barang_id"));
            const deskripsi = <string>user_input.get("deskripsi");
            const jumlah_barang = Number(user_input.get("jumlah_barang"));
            
            if (isNaN(barang_id) || !barang_id || !deskripsi || isNaN(jumlah_barang) || !jumlah_barang) return new Response("Bad Request", {status: 400});

            const res = await db
            .selectFrom('barang')
            .select(['id', 'nama_barang', 'stok_barang'])
            .where('id', '=', barang_id)
            .executeTakeFirst();

            if (!res) return new Response("1", {status: 404});

            const now = Date.now();
            const tanggal_key = global.date.getFullYear() * 10000 + (global.date.getMonth() + 1) * 100 + global.date.getDate();
            let last_row;

            try {
                last_row = await db.transaction().execute(async (trx) => {
                    const result = await trx
                    .insertInto('barang_masuk')
                    .values({
                        tanggal_key,
                        barang_id,
                        deskripsi,
                        jumlah_barang,
                        created_ms: now,
                        modified_ms: now
                    })
                    .executeTakeFirstOrThrow();

                    await trx
                    .updateTable('barang')
                    .set({
                        stok_barang: sql`stok_barang + ${jumlah_barang}`
                    })
                    .where('id', '=', barang_id)
                    .execute();

                    return Number(result.insertId);;
                });
            } catch (e) {
                console.log("An error occured in post_method.ts at /barang_masuk:", e);
                return new Response("Internal Server Error", { status: 500 });
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 6,
                code: "TAMBAH_BARANG_MASUK",
                data: {
                    id: last_row,
                    nama_barang: res.nama_barang,
                    deskripsi,
                    jumlah_barang: jumlah_barang,
                    tanggal_key,
                    barang_id: res.id,
                    stok_barang: res.stok_barang + jumlah_barang
                }
            }));
            return new Response("", {status: 200});
        }
        case "/user": { // add user (administrator permission only)
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const username = <string>user_input.get("username");
            const full_name = <string>user_input.get("full_name");
            const password = <string>user_input.get("password");
            const role_id = Number(user_input.get("role_id"));

            if (
                !username || !full_name || !password || !role_id || isNaN(role_id) // kalo misalnya username, full_name, password dan role_id nya ga ada
                || password.length < 8 // kalo misalnya password nya kurang dari 8 length nya
                || !/^[a-z0-9_]+$/.test(username) // kalo username nya mengandung diluar a to z, 0 to 9 dan _
            ) return new Response("Bad Request", {status: 400});

            const now = Date.now();
            try {
                const passwordHash = get_password_hash_only(
                    await Bun.password.hash(password, {
                        algorithm: "argon2id",
                        timeCost: global.ph_timecost,
                        memoryCost: global.ph_memorycost,
                    }),
                );

                await db
                .insertInto('users')
                .values({
                    username,
                    full_name,
                    password_hash: passwordHash,
                    role_id,
                    created_ms: now,
                    modified_ms: now
                })
                .execute();
            } catch (e: any) {
                if (e.code === "ER_DUP_ENTRY" || e.errno === 1062) return new Response("1", { status: 403 });
                console.log("Unexpected error in post_method.ts at /user:", e);
                return new Response("Internal Server Error", { status: 500 });
            }

            global.sse_clients.send_to_role(1, JSON.stringify({
                type: 1,
                code: "REFRESH_USERS"
            }))

            return new Response("", {status: 200});
        }
        case "/role": {
            // add role (administrator permission only)
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const role_name = <string>user_input.get("role_name");
            const permission_level = Number(user_input.get("permission_level"));

            if (!role_name || isNaN(permission_level) || (permission_level & global.permissions.ADMINISTRATOR)) return new Response("Bad Request", {status: 400});

            const now = Date.now();
            try {
                await db
                .insertInto('roles')
                .values({
                    name: role_name,
                    permission_level,
                    created_ms: now,
                    modified_ms: now
                })
                .execute();
            } catch (e: any) {
                if (e.code === "ER_DUP_ENTRY" || e.errno === 1062) return new Response("1", { status: 403 });
                
                console.log("An error occured in post_method.ts at /role:", e);
                return new Response("Internal Server Error", { status: 500 });
            }

            global.sse_clients.send_to_role(1, JSON.stringify({
                type: 1,
                code: "REFRESH_RP"
            }))
            
            return new Response("", {status: 200})
        }
        case "/logout": {
            if (!token) return new Response("Bad Request", {status: 400});
            
            global.user_sessions.remove(token);
            global.sse_clients.remove(token);
            
            return new Response("", {status: 302, headers: {
                "set-cookie": "token=; Path=/; Max-Age=0"
            }});
        }
        default: {
            return new Response("Not Found", {status: 404});
        }
    }
}