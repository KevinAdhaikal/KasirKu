import { mime_types, parse_cookie } from "../utils/utils";
import { global } from "../global";
import { user_session_interface } from "../user_session/user_session";
import { sql } from "kysely";

const protected_routes: Record<string, number> = {
    "/rp.html": global.permissions.ADMINISTRATOR,
    "/users.html": global.permissions.ADMINISTRATOR,
    "/index.html": global.permissions.ADMINISTRATOR | global.permissions.DASHBOARD,
    "/barang/daftar_barang.html": global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG,
    "/barang/kategori_barang.html": global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG,
    "/kasir/kasir.html": global.permissions.ADMINISTRATOR | global.permissions.KASIR,
    "/pembukuan/penjualan.html": global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN,
    "/pembukuan/pengeluaran.html": global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN,
    "/pembukuan/laporan.html": global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN,
};

export async function get_method(req: Request, url: URL, remote_ip: string) {
    let pathname = url.pathname.replace(/\/+/g, "/");

    if (pathname.startsWith("/api/")) {
        if (!global.rate_limit.check(remote_ip)) return new Response("Too Many Requests", {status: 429});

        const api_path = pathname.slice(5);

        if (api_path === "sse") {
            const cookies = parse_cookie(req.headers.get("cookie") as string);
            const token = <string>cookies.get("token");

            const user_info = global.user_sessions.get(token) as user_session_interface;
            if (!user_info) {
                return new Response(new ReadableStream({
                    start(controller) {
                        controller.enqueue(
                            new TextEncoder().encode("data: " + JSON.stringify({
                                type: 1,
                                code: "UNAUTHORIZED"
                            }) + "\n\n")
                        )
                        controller.close();
                    }
                }), {
                    headers: {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive"
                    }
                });
            }

            return new Response(global.sse_clients.add(token, req, user_info), {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Credentials": true
                } as any,
            });
        }

        const token = req.headers.get("token") as string;
        const user_info = global.user_sessions.get(token);
        if (!token || !user_info) return new Response("Unauthorized", {status: 401});

        switch(api_path) {
            case "info_total": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.DASHBOARD))) return new Response("0", {status: 403});

                const user_input = url.searchParams;
                const tanggal_key = Number(user_input.get("tanggal_key"));

                if (isNaN(tanggal_key) || !tanggal_key) return new Response("Bad Request", {status: 400});

                const res = await db
                .selectFrom('penjualan') // Dummy source, karena kita pake subqueries
                .select([
                    sql<number>`(SELECT SUM(total_barang) FROM penjualan WHERE tanggal_key = ${tanggal_key})`.as('total_barang'),
                    sql<number>`(SELECT SUM(total_harga_modal) FROM penjualan WHERE tanggal_key = ${tanggal_key})`.as('total_harga_modal'),
                    sql<number>`(SELECT SUM(total_harga_jual) FROM penjualan WHERE tanggal_key = ${tanggal_key})`.as('total_harga_jual'),
                    sql<number>`(SELECT SUM(jumlah_uang) FROM pembukuan WHERE tanggal_key = ${tanggal_key} AND tipe = 1)`.as('jumlah_uang')
                ])
                .executeTakeFirst();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "barang_kosong": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.DASHBOARD))) return new Response("0", {status: 403});

                const res = await db
                .selectFrom('barang')
                .select('nama_barang')
                .where('stok_barang', '<=', 0)
                .execute();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "penjualan_item_tanggal": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                const user_input = url.searchParams;
                const tanggal_start = Number(user_input.get("tanggal_start"));
                const tanggal_end = Number(user_input.get("tanggal_end"));

                if (isNaN(tanggal_start) || isNaN(tanggal_end) || !tanggal_start || !tanggal_end) return new Response("Bad Request", {status: 400});

                const res = await db
                .selectFrom('penjualan_item')
                .select([
                    'nama_barang',
                    ({ fn }) => fn.sum('jumlah').as('jumlah')
                ])
                .where('tanggal_key', '>=', tanggal_start)
                .where('tanggal_key', '<=', tanggal_end)
                .groupBy('nama_barang')
                .execute();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "barang": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const id = Number(user_input.get("id"));
                
                let res;
                const query = db
                .selectFrom('barang as b')
                .innerJoin('kategori_barang as k', 'b.kategori_barang_id', 'k.id')
                .select([
                    'b.id',
                    'b.nama_barang',
                    'b.stok_barang',
                    'b.kategori_barang_id',
                    'b.harga_modal',
                    'b.harga_jual',
                    'b.barcode_barang',
                    'b.created_ms',
                    'b.modified_ms',
                    'k.nama_kategori as nama_kategori'
                ]);

                if (isNaN(id) || !id) res = await query.execute();
                else res = await query.where('b.id', '=', id).executeTakeFirst();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "kategori_barang": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                const user_input = url.searchParams;
                const id = Number(user_input.get("id"));

                let res;
                const query = db.selectFrom('kategori_barang').selectAll();

                if (isNaN(id) || !id) res = await query.execute();
                else res = await query.where('id', '=', id).executeTakeFirst();
                
                return new Response(JSON.stringify(res), {status: 200});
            }
            case "cari_barang": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const barang = <string>user_input.get("barang"); // nama barang and barcode barang
                const bm = <string>user_input.get("bm"); // apakah cari barang ini untuk barang masuk?
                if (!barang) return new Response("Bad Request", {status: 400});

                const query = db.selectFrom('barang').selectAll();

                let res;
                if (bm) {
                    res = await query
                    .where((eb) => eb.or([
                        eb('barcode_barang', '=', barang),
                        eb('nama_barang', 'like', `%${barang}%`)
                    ]))
                    .execute();
                } else {
                    res = await query
                    .where('stok_barang', '>', 0)
                    .where((eb) => eb.or([
                        eb('barcode_barang', '=', barang),
                        eb('nama_barang', 'like', `%${barang}%`)
                    ]))
                    .execute();
                }
                
                return new Response(JSON.stringify(res), {status: 200});
            }
            case "bak_list": { // barang assigned kategori (BAK) list
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const id = Number(user_input.get("id"));
                if (isNaN(id) || !id) return new Response("Bad Request", {status: 400});

                const res = await db
                .selectFrom('barang')
                .select(['nama_barang', 'stok_barang', 'harga_jual'])
                .where('kategori_barang_id', '=', id)
                .execute();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "barang_masuk": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const tanggal_key = Number(user_input.get("tanggal_key"));
                if (isNaN(tanggal_key) || !tanggal_key) return new Response("Bad Request", {status: 400});
                
                const res = await db
                .selectFrom('barang_masuk as bm')
                .innerJoin('barang as b', 'b.id', 'bm.barang_id')
                .select([
                    'bm.id',
                    'b.nama_barang',
                    'bm.deskripsi',
                    'bm.jumlah_barang'
                ])
                .where('bm.tanggal_key', '=', tanggal_key)
                .execute();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "penjualan": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

                const user_input = url.searchParams;
                const tanggal_key = Number(user_input.get("tanggal_key"));
                const id = Number(user_input.get("id"));

                let res;
                const query = db.selectFrom('penjualan').selectAll();

                if (isNaN(id) || !id) {
                    if (isNaN(tanggal_key)) return new Response("Bad Request", { status: 400 });
                    
                    res = await query
                    .where('tanggal_key', '=', tanggal_key)
                    .execute();
                } else {
                    res = await query
                    .where('id', '=', id)
                    .executeTakeFirst();
                }

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "penjualan_item": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

                const user_input = url.searchParams;
                const penjualan_id = Number(user_input.get("penjualan_id"));

                if (isNaN(penjualan_id)) return new Response("Bad Request", {status: 400});

                const res = await db
                .selectFrom('penjualan_item')
                .select([
                    'jumlah',
                    'harga_jual',
                    'tanggal_key',
                    'created_ms',
                    'modified_ms',
                    'nama_barang'
                ])
                .where('penjualan_id', '=', penjualan_id)
                .execute();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "pengeluaran": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

                const user_input = url.searchParams;
                const tanggal_key = Number(user_input.get("tanggal_key"));
                const id = Number(user_input.get("id"));

                let res;
                const query = db
                .selectFrom('pembukuan')
                .selectAll()
                .where('tipe', '=', 1);

                if (!isNaN(id) && id) {
                    res = await query
                    .where('id', '=', id)
                    .executeTakeFirst();
                } else {
                    if (isNaN(tanggal_key)) return new Response("Bad Request", { status: 400 });
                    
                    res = await query
                    .where('tanggal_key', '=', tanggal_key)
                    .execute();
                }

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "laporan": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

                const user_input = url.searchParams;
                
                const tanggal_start = Number(user_input.get("tanggal_start"));
                const tanggal_end = Number(user_input.get("tanggal_end"));

                if (isNaN(tanggal_start) || isNaN(tanggal_end) || !tanggal_start || !tanggal_end) return new Response("Bad Request", {status: 400});

                const penjualan = await db
                .selectFrom('penjualan')
                .selectAll()
                .where('tanggal_key', '>=', tanggal_start)
                .where('tanggal_key', '<=', tanggal_end)
                .execute();

                const pengeluaran = await db
                .selectFrom('pembukuan')
                .selectAll()
                .where('tipe', '=', 1)
                .where('tanggal_key', '>=', tanggal_start)
                .where('tanggal_key', '<=', tanggal_end)
                .execute();

                return new Response(JSON.stringify({
                    penjualan, pengeluaran
                }), {status: 200});
            }
            case "profile": { // get your current user information
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});

                const res = await db
                .selectFrom('users as u')
                .innerJoin('roles as r', 'u.role_id', 'r.id')
                .select([
                    'u.id',
                    'u.username',
                    'u.full_name',
                    'u.profile_img',
                    'u.modified_ms',
                    'u.created_ms',
                    'r.name as role_name',
                    'r.permission_level as permission_level'
                ])
                .where('u.id', '=', user_info.user_id)
                .executeTakeFirst();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "user": { // get user information by id (administrator permission only)
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});
                
                const user_input = url.searchParams;
                const id = Number(user_input.get("id"));

                if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});

                const res = await db
                .selectFrom('users')
                .select([
                    'username',
                    'full_name',
                    'role_id',
                    'profile_img',
                    'created_ms',
                    'modified_ms'
                ])
                .where('id', '=', id)
                .executeTakeFirst();

                if (!res) return new Response("Not Found", {status: 404});

                return new Response(JSON.stringify(res), {status: 200, headers: {
                    "Cache-Control": "no-store"
                }});
            }
            case "users": { // get list of all users information (administrator permission only)
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});
                
                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

                const res = await db
                .selectFrom('users')
                .select([
                    'id',
                    'username',
                    'full_name',
                    'role_id',
                    'profile_img',
                    'created_ms',
                    'modified_ms'
                ])
                .execute();

                return new Response(JSON.stringify(res), {status: 200, headers: {
                    "Cache-Control": "no-store"
                }});
            }
            case "roles": { // get list of all roles information (administrator permission only)
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});
                    
                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

                const res = await db
                .selectFrom('roles')
                .selectAll()
                .execute();

                return new Response(JSON.stringify(res), {status: 200, headers: {
                    "Cache-Control": "no-store"
                }});
            }
            case "role": { // get role information by id (administrator permission only)
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});
                    
                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const id = Number(user_input.get("id"));

                if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});

                const res = await db
                .selectFrom('roles')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();

                if (!res) return new Response("Not Found", {status: 404});
                
                return new Response(JSON.stringify(res), {status: 200, headers: {
                    "Cache-Control": "no-store"
                }});
            }
            case "uar_list": { // user assigned role (UAR) list
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const id = Number(user_input.get("id"));

                if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});

                const res = await db
                .selectFrom('users')
                .select(['username', 'full_name'])
                .where('role_id', '=', id)
                .execute();

                if (!res) return new Response("Not Found", {status: 404});
                
                return new Response(JSON.stringify(res), {status: 200, headers: {
                    "Cache-Control": "no-store"
                }});
            }
            default: {
                return new Response("Not Found", {status: 404});
            }
        }
    }

    if (pathname === "/") pathname = "/index.html";
    if (pathname.endsWith(".")) pathname = pathname.slice(0, -1) + ".html";
    if (!pathname.includes(".")) pathname += ".html";

    const cookies = parse_cookie(req.headers.get("cookie") as string);
    const user_info = global.user_sessions.get(cookies.get("token") as string) as user_session_interface;

    if (pathname.startsWith("/profile_img/")) {
        const file = Bun.file(pathname.slice(1));
        if (!(await file.exists())) return new Response("Not Found", {status: 404});
        return new Response(file.stream(), {status: 200, headers: {
            "Content-Type": mime_types[pathname.split(".").pop() || ""] || "application/octet-stream",
        }});
    }

    if (pathname.endsWith(".html")) {
        if (!user_info) {
            if (pathname !== "/login.html") return new Response("", {
                status: 302,
                headers: {
                    "Location": "/login",
                    "set-cookie": "token=; Path=/; Max-Age=0"
                }
            })
        }
        else if (user_info) {
            if (pathname === "/login.html") return new Response("", {
                status: 302,
                headers: {
                    "Location": "/",
                }
            })
        }

        const required_perm = protected_routes[pathname];

        const db = global.database;
        if (!db) return new Response("Internal Server Error", {status: 500});
        const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst() as {permission_level: number};
        
        if (required_perm && !(res_role.permission_level & required_perm)) {
            for (const [key, value] of Object.entries(protected_routes)) {
                if (res_role.permission_level & value) return Response.redirect(key);
            }
        }
    }

    let cached = global.static_cache.get(pathname);

    if (!cached) {
        const path = global.config.compile_html ? `html_build${pathname}` : `html${pathname}`
        let file = Bun.file(path);

        if (!(await file.exists())) {
            pathname = "/404/index.html";
            file = Bun.file(path);
        }

        if (!(await file.exists())) {
            return new Response("Not Found", {
                status: 404,
                headers: {
                    "Content-Type": "text/html",
                    "Strict-Transport-Security":
                        "max-age=300; includeSubDomains; preload",
                    "X-Frame-Options": "DENY",
                    "X-Content-Type-Options": "nosniff",
                },
            });
        }

        const buffer = new Uint8Array(await file.arrayBuffer());
        const last_modified = file.lastModified;

        cached = { buffer, last_modified };

        global.static_cache.set(pathname, cached);
    }

    const { buffer, last_modified } = cached;
    const etag = last_modified.toString();

    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304 });
    const is_asset = pathname.startsWith("/plugins/") || pathname.startsWith("/dist/") || pathname === "/favicon.ico";

    return new Response(<BodyInit>buffer, {
        status: 200,
        headers: {
            "Content-Type": mime_types[pathname.split(".").pop() || ""] || "application/octet-stream",
            "Strict-Transport-Security": "max-age=300; includeSubDomains; preload",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            ETag: etag,
            "Cache-Control": is_asset
            ? "public, max-age=31536000"
            : "no-cache",
            "Content-Encoding": global.config.compile_html ? "br" : "none"
        },
    });
}