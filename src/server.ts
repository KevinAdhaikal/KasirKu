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

import { global } from "./global";
import * as Bun from "bun";
import { user_session_interface } from "./user_session/user_session";
import { parse_cookie, mime_types } from "./utils/utils";

let is_server_closed = false;
let bun_serve: any;
let bun_serve2: any;

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

async function stop_server() {
    if (!is_server_closed) {
        is_server_closed = true;

        console.log("[LOG] Stopping Server...");

        bun_serve.stop();
        if (bun_serve2) bun_serve2.stop();

        if (global.database) await global.database.destroy();

        global.sse_clients.destroy();
        global.rate_limit.destroy();
        global.user_sessions.destroy();

        console.log("[LOG] Server has been stopped!");
    }
}

export function main() {
    const protocol = global.config.use_tls ? "HTTPS" : "HTTP";
    console.log(`[LOG] ${protocol} Server running in port ${global.config.listen_port}`);

    const fetch_handler = async (req: Request, server: any) => {
        const url = new URL(req.url);
        url.pathname = decodeURIComponent(url.pathname);
        const remote_ip = server.requestIP(req)?.address;
        if (!remote_ip) return new Response(null, {status: 400});

        if (req.method === "GET") {
            let pathname = url.pathname.replace(/\/+/g, "/");

            if (pathname.startsWith("/api/")) { 
                if (!global.rate_limit.check(remote_ip)) return new Response("Too Many Requests", {status: 429});

                const api_path = pathname.slice(5);

                if (api_path === "sse") {
                    const cookies = parse_cookie(req.headers.get("cookie") as string);
                    const token = <string>cookies.get("token");
                    const user_info = global.user_sessions.get(token);

                    if (!token || !user_info) {
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
                if (!token || !user_info) {
                    return new Response("Unauthorized", {status: 401});
                }

                const endpoint_function = global.method_cache[req.method]?.[api_path];
                if (!endpoint_function) return new Response("Not Found", {status: 404})

                try {
                    return await endpoint_function(req, url, user_info);
                } catch (err: any) {
                    console.log(err);
                }
            }
            if (pathname[pathname.length - 1] === "/") pathname += "index.html";
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
        else if (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE") {
            if (!global.rate_limit.check(remote_ip)) return new Response("Too Many Requests", {status: 429});

            const endpoint_function = global.method_cache[req.method]?.[url.pathname.slice(1)];
            if (!endpoint_function) return new Response("Not Found", {status: 404})

            try {
                return await endpoint_function(req, req.headers.get("token"));
            } catch (err: any) {
                console.log(err);
            }
        }
        else return new Response("Bad Request", {status: 400});
    };

    if (global.config.use_tls) {
        bun_serve = Bun.serve({
            port: global.config.listen_port,
            tls: {
                key: Bun.file(global.config.tls_key_path),
                cert: Bun.file(global.config.tls_cert_path)
            },
            fetch: fetch_handler,
            error(err: Error) {
                console.log(err);
                return new Response("Internal Server Error", {status: 500});
            }
        });

        bun_serve2 = Bun.serve({
            port: 80,
            async fetch(req: Request) {
                const url = new URL(req.url);

                url.protocol = "https:";
                url.port = String(global.config.listen_port);

                return Response.redirect(url.toString(), 302);
            }
        });
    } else {
        bun_serve = Bun.serve({
            port: global.config.listen_port,
            fetch: fetch_handler,
            error(err: Error) {
                console.log(err);
                return new Response("Internal Server Error", {status: 500});
            }
        });
        bun_serve2 = null;
    }
    process.on("SIGINT", async () => {await stop_server()});
    process.on("SIGTERM", async () => {await stop_server()});
}