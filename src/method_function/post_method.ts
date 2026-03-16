import { global } from "../global";
import * as Bun from "bun";
import { get_password_hash_only } from "../utils/utils";

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

            let stmt = db.prepare("SELECT id, password_hash, role_id FROM users WHERE username = ?");
            const row = stmt.get(username) as {id: number, password_hash: string, role_id: number};

            stmt.finalize();

            if (!row) return new Response("Forbidden", {status: 403});

            if (!Bun.password.verifySync(password, global.ph_text + row.password_hash)) return new Response("Forbidden", {status: 403});

            const session_id = global.user_sessions.add(row.id, row.role_id);
            if (!session_id) return new Response("Internal Server Error", {status: 500});

            return new Response(session_id, {status: 200, headers: {
                "set-cookie": `token=${session_id}; Path=/; HttpOnly; Secure`
            }})
        }
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

            const nama_barang = <string>user_input.get("nama_barang");
            const stok_barang = Number(user_input.get("stok_barang"));
            const kategori_barang_id = Number(user_input.get("kategori_barang_id"));
            const harga_modal = Number(user_input.get("harga_modal"));
            const harga_jual = Number(user_input.get("harga_jual"));
            let barcode_barang = <string | null>user_input.get("barcode_barang");
            
            if (!nama_barang || isNaN(kategori_barang_id) || !stok_barang || isNaN(stok_barang) || !kategori_barang_id || !harga_modal || !harga_jual) return new Response("Bad Request", {status: 400});
            if (!barcode_barang || !barcode_barang.length) barcode_barang = null;

            const now = Date.now();
            let last_row = null;
            try {
                last_row = db.run("INSERT INTO barang (nama_barang, stok_barang, kategori_barang_id, harga_modal, harga_jual, barcode_barang, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
                    nama_barang,
                    stok_barang,
                    kategori_barang_id,
                    harga_modal,
                    harga_jual,
                    barcode_barang,
                    now,
                    now
                ]).lastInsertRowid;
            } catch(e) {
                console.log("An error occured in post_method.ts at /barang:", e);
                return new Response("Internal Server Error", {status: 500});
            }

            if (!last_row) return new Response("Internal Server Error", {status: 500});
            global.sse_clients.broadcast(JSON.stringify({
                type: 2,
                code: "TAMBAH_BARANG",
                data: {
                    id: last_row
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

            const nama_kategori = <string>user_input.get("nama_kategori");

            if (!nama_kategori) return new Response("Bad Request", {status: 400});

            const now = Date.now();
            let last_row = null;
            try {
                last_row = db.run("INSERT INTO kategori_barang (nama_kategori, created_ms, modified_ms) VALUES (?, ?, ?)", [
                    nama_kategori,
                    now,
                    now
                ]).lastInsertRowid;
            } catch(e: any) {
                if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return new Response("1", {status: 403});
                console.log("An error occured in post_method.ts at /kategori_barang:", e);
                return new Response("Internal Server Error", {status: 500});
            }

            if (!last_row) return new Response("Internal Server Error", {status: 500});

            global.sse_clients.broadcast(JSON.stringify({
                type: 3,
                code: "TAMBAH_KATEGORI",
                data: {
                    id: last_row
                }
            }));

            return new Response("", {status: 200});
        }
        case "/masuk_ke_pembukuan": {
            const user_info = global.user_sessions.get(token);
            if (!token || !user_info) return new Response("Unauthorized", {status: 401});

            const db = global.database;
            if (!db) return new Response("Internal Server Error", {status: 500});
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
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
            
            stmt = db.prepare("SELECT nama_barang, stok_barang, harga_modal, harga_jual FROM barang WHERE id = ?");

            for (const data of items) {
                total_barang += data.jumlah_barang;
                
                const barang = stmt.get(data.id) as { nama_barang: string, stok_barang: number, harga_modal: number, harga_jual: number };

                if ((barang.stok_barang - data.jumlah_barang) < 0) {
                    stmt.finalize();
                    return new Response("1", {status: 403});
                }
                data.harga_modal = barang.harga_modal;
                data.harga_jual = barang.harga_jual;
                data.nama_barang = barang.nama_barang;
                
                total_harga_modal += data.harga_modal * data.jumlah_barang;
                total_harga_jual += data.harga_jual * data.jumlah_barang;
            }

            stmt.finalize();

            let last_row: any = null;
            try {
                db.transaction(() => {
                    stmt = db.prepare("INSERT INTO penjualan (total_barang, total_harga_modal, total_harga_jual, tanggal_key, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?)");
                    last_row = stmt.run(total_barang, total_harga_modal, total_harga_jual, date_now, now, now).lastInsertRowid;
                    stmt.finalize();

                    stmt = db.prepare("INSERT INTO pembukuan (tipe, jumlah_uang, referensi_id, tanggal_key, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?)");
                    stmt.run(0, total_harga_jual, last_row, date_now, now, now);
                    stmt.finalize();
                    
                    stmt = db.prepare("INSERT INTO penjualan_item (penjualan_id, barang_id, nama_barang, jumlah, harga_modal, harga_jual, tanggal_key, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    const stmt2 = db.prepare("UPDATE barang SET stok_barang = CASE WHEN stok_barang - ? < 0 THEN 0 ELSE stok_barang - ? END WHERE id = ?");

                    for (const e of items) {
                        stmt.run(last_row, e.id, e.nama_barang, e.jumlah_barang, e.harga_modal * e.jumlah_barang, e.harga_jual * e.jumlah_barang, date_now, now, now);
                        stmt2.run(e.jumlah_barang, e.jumlah_barang, e.id);
                    }

                    stmt.finalize();
                    stmt2.finalize();
                })();
            } catch (e) {
                console.log("An error occured in post_method.ts at /masuk_ke_pembukuan:", e);
                return new Response("Internal Server Error", {status: 500});
            }

            global.sse_clients.broadcast(JSON.stringify({
                type: 4,
                code: "TAMBAH_PENJUALAN",
                data: {
                    id: last_row,
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
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const deskripsi = <string>user_input.get("deskripsi");
            const nominal = Number(user_input.get("nominal"));

            if (!deskripsi || !nominal) return new Response("Bad Reuqest", {status: 400});

            const now = Date.now();
            const date_now = global.date.getFullYear() * 10000 + (global.date.getMonth() + 1) * 100 + global.date.getDate();
            let last_row = null;

            try {
                last_row = db.run("INSERT INTO pembukuan (tipe, deskripsi, jumlah_uang, tanggal_key, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?)", [
                    1,
                    deskripsi,
                    nominal,
                    date_now,
                    now,
                    now
                ]).lastInsertRowid
            } catch(e) {
                console.log("Unexpected error in post_method.ts at /pengeluaran:", e);
                return new Response("Internal Server Error", {status: 500});
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
        case "/user": { // add user (administrator permission only)
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

            const username = <string>user_input.get("username");
            const full_name = <string>user_input.get("full_name");
            const password = <string>user_input.get("password");
            const role_id = Number(user_input.get("role_id"));

            if (!username || !full_name || !password || password.length < 8 || !role_id || isNaN(role_id)) return new Response("Bad Request", {status: 400});

            const now = Date.now();
            try {
                db.run("INSERT INTO users (username, full_name, password_hash, role_id, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?)", [
                    username,
                    full_name,
                    get_password_hash_only(
                        Bun.password.hashSync(password, {
                            algorithm: "argon2id",
                            timeCost: global.ph_timecost,
                            memoryCost: global.ph_memorycost,
                        }),
                    ),
                    role_id,
                    now,
                    now
                ]);
            } catch(e: any) {
                if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return new Response("1", {status: 403});
                
                console.log("Unexpected error in post_method.ts at /user:", e);
                return new Response("Internal Server Error", {status: 500});
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
            let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
            const res_role = stmt.get(user_info.role_id) as {permission_level: number};
            stmt.finalize();
            if (!res_role) return new Response("Internal Server Error", {status: 500});

            if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

            const user_input = new URLSearchParams(await req.text());

            const role_name = <string>user_input.get("role_name");
            const permission_level = Number(user_input.get("permission_level"));

            if (!role_name || isNaN(permission_level) || (permission_level & global.permissions.ADMINISTRATOR)) return new Response("Bad Request", {status: 400});

            const now = Date.now();
            try {
                db.run("INSERT INTO roles (name, permission_level, created_ms, modified_ms) VALUES (?, ?, ?, ?)", [
                    role_name,
                    permission_level,
                    now,
                    now
                ]);
            } catch(e: any) {
                if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return new Response("1", {status: 403});
                console.log("An error occured in post_method.ts at /role:", e);
                return new Response("Internal Server Error", {status: 500});
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