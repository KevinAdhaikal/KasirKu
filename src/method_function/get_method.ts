import { mime_types, parse_cookie } from "../utils/utils";
import { global } from "../global";
import { user_session_interface } from "../user_session/user_session";

const protected_routes: Record<string, number> = {
    "/rp.html": global.permissions.ADMINISTRATOR,
    "/users.html": global.permissions.ADMINISTRATOR,
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
            case "barang": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const id = Number(user_input.get("id"));
                if (isNaN(id) || !id) return new Response("Bad Request", {status: 400});

                stmt = db.prepare("SELECT b.id, b.nama_barang, b.stok_barang, b.kategori_barang_id, b.harga_modal, b.harga_jual, b.barcode_barang, b.created_ms, b.modified_ms, k.nama_kategori AS nama_kategori FROM barang b JOIN kategori_barang k ON b.kategori_barang_id = k.id WHERE b.id = ?");
                const res = stmt.get(id);
                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "daftar_barang": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                stmt = db.prepare("SELECT b.id, b.nama_barang, b.stok_barang, b.kategori_barang_id, b.harga_modal, b.harga_jual, b.barcode_barang, b.created_ms, b.modified_ms, k.nama_kategori AS nama_kategori FROM barang b JOIN kategori_barang k ON b.kategori_barang_id = k.id");
                const res = stmt.all();
                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "kategori_barang": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                stmt = db.prepare("SELECT * FROM kategori_barang");
                const res = stmt.all();
                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "cari_barang": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const barang = <string>user_input.get("barang"); // nama barang and barcode barang
                if (!barang) return new Response("Bad Request", {status: 400});

                stmt = db.prepare("SELECT * FROM barang WHERE barcode_barang = ? OR nama_barang LIKE '%' || ? || '%'");
                const res = stmt.all(barang, barang);
                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "bak_list": { // barang assigned kategori (BAK) list
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const id = Number(user_input.get("id"));
                if (isNaN(id) || !id) return new Response("Bad Request", {status: 400});

                stmt = db.prepare("SELECT nama_barang, stok_barang, harga_jual FROM barang WHERE kategori_barang_id = ?");
                const res = stmt.all(id);
                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "penjualan": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

                const user_input = url.searchParams;
                const tanggal_key = Number(user_input.get("tanggal_key"));

                if (isNaN(tanggal_key)) return new Response("Bad Request", {status: 400});

                stmt = db.prepare("SELECT * FROM penjualan WHERE tanggal_key = ?");
                const res = stmt.get(tanggal_key);
                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "pengeluaran": {
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

                const user_input = url.searchParams;
                const tanggal_key = Number(user_input.get("tanggal_key"));

                if (isNaN(tanggal_key)) return new Response("Bad Request", {status: 400});

                stmt = db.prepare("SELECT * FROM pembukuan WHERE tanggal_key = ? AND type = 1");
                const res = stmt.get(tanggal_key);
                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "profile": { // get your current user information
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});

                const stmt = db.prepare("SELECT u.id, u.username, u.full_name, u.profile_img, u.modified_ms, u.created_ms, r.name AS role_name, r.permission_level AS permission_level FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?");
                const res = stmt.get(user_info.user_id);
                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200});
            }
            case "user": { // get user information by id (administrator permission only)
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});
                
                const user_input = url.searchParams;
                const id = Number(user_input.get("id"));

                if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});

                stmt = db.prepare("SELECT username, full_name, role_id, profile_img, created_ms, modified_ms FROM users WHERE id = ?");
                const res = stmt.get(id);

                stmt.finalize();

                if (!res) return new Response("Not Found", {status: 404});

                return new Response(JSON.stringify(res), {status: 200, headers: {
                    "Cache-Control": "no-store"
                }});
            }
            case "users": { // get list of all users information (administrator permission only)
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});
                
                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

                stmt = db.prepare("SELECT id, username, full_name, role_id, profile_img, created_ms, modified_ms FROM users");
                const res = stmt.all();

                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200, headers: {
                    "Cache-Control": "no-store"
                }});
            }
            case "roles": { // get list of all roles information (administrator permission only)
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});
                    
                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

                stmt = db.prepare("SELECT * FROM roles");
                const res = stmt.all();

                stmt.finalize();

                return new Response(JSON.stringify(res), {status: 200, headers: {
                    "Cache-Control": "no-store"
                }});
            }
            case "role": { // get role information by id (administrator permission only)
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});
                    
                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const id = Number(user_input.get("id"));

                if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});

                stmt = db.prepare("SELECT * FROM roles WHERE id = ?");
                const res = stmt.get(id);

                stmt.finalize();

                if (!res) return new Response("Not Found", {status: 404});
                
                return new Response(JSON.stringify(res), {status: 200, headers: {
                    "Cache-Control": "no-store"
                }});
            }
            case "uar_list": { // user assigned role (UAR) list
                const db = global.database;
                if (!db) return new Response("Internal Server Error", {status: 500});
                let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
                const res_role = stmt.get(user_info.role_id) as {permission_level: number};
                stmt.finalize();
                if (!res_role) return new Response("Internal Server Error", {status: 500});

                if (!(res_role.permission_level & global.permissions.ADMINISTRATOR)) return new Response("0", {status: 403});

                const user_input = url.searchParams;

                const id = Number(user_input.get("id"));

                if (!id || isNaN(id)) return new Response("Bad Request", {status: 400});

                stmt = db.prepare("SELECT username, full_name FROM users WHERE role_id = ?");
                const res = stmt.all(id);

                stmt.finalize();

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

    // global.static_cache: new Map(string, Buffer)
    if (pathname === "/") pathname = "/index.html";
    if (pathname.endsWith(".")) pathname = pathname.slice(0, -1) + ".html";
    if (!pathname.includes(".")) pathname += ".html";

    const cookies = parse_cookie(req.headers.get("cookie") as string);
    const user_info = global.user_sessions.get(cookies.get("token") as string) as user_session_interface;

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
        let stmt = db.prepare("SELECT permission_level FROM roles WHERE id = ?");
        const res_role = stmt.get(user_info.role_id) as {permission_level: number};
        stmt.finalize();

        if (required_perm && !(res_role.permission_level & required_perm)) pathname = "/404/index.html";
    }

    const should_cache = !pathname.endsWith(".html") && !pathname.startsWith("/profile_img/");
    const cache_key = pathname;

    let cached = should_cache ? global.static_cache.get(cache_key) : null;

    if (!cached) {
        let file = Bun.file(`html${pathname}`);

        if (!(await file.exists())) {
            pathname = "/404/index.html";
            file = Bun.file(`html${pathname}`);
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

        if (should_cache) global.static_cache.set(cache_key, cached);
    }

    const { buffer, last_modified } = cached;
    const etag = last_modified.toString();

    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304 });

    return new Response(<BodyInit>buffer, {
        status: 200,
        headers: {
            "Content-Type": mime_types[pathname.split(".").pop() || ""] || "application/octet-stream",
            "Strict-Transport-Security": "max-age=300; includeSubDomains; preload",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            ETag: etag,
            "Cache-Control": "no-cache",
        },
    });
}