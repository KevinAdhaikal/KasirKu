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
import { user_session, user_session_interface } from "./user_session/user_session";
import { parse_cookie, mime_types } from "./utils/utils";
import { sse_server } from "./sse_server/sse_server";
import { rate_limit } from "./rate_limit/rate_limit";

let is_server_closed = false;
let bun_serve: any;
let bun_serve2: any;

async function stop_server() {
    if (!is_server_closed) {
        is_server_closed = true;

        console.log("[LOG] Stopping Server...");

        bun_serve.stop();
        if (bun_serve2) bun_serve2.stop();

        Bun.env.DB_TYPE?.lastIndexOf("sql") === 0 ? (global.database as any).$client.close() : await (global.database as any).$client.end();

        global.sse_clients.destroy();
        global.rate_limit.destroy();
        global.user_sessions.destroy();

        console.log("[LOG] Server has been stopped!");
    }
}

function init_global() {
    global.user_sessions = new user_session(600, 60, 32); // user sessions
    global.sse_clients = new sse_server(5000); // sse clients
    global.rate_limit = new rate_limit(10, 100, 5); // rate limit (max req 100/10 seconds. jail for 25 seconds)
}

function with_cors(res: Response, req: Request): Response {
    const origin = req.headers.get("origin");
    if (origin) {
        res.headers.set("Access-Control-Allow-Origin", origin);
        res.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return res;
}

export function main() {
    init_global();
    const protocol = Bun.env.APP_USE_TLS ? "HTTPS" : "HTTP";
    console.log(`[LOG] ${protocol} Server running in port ${Bun.env.APP_LISTEN_PORT}`);

    const fetch_handler = async (req: Request, server: any) => {
        const origin = req.headers.get("origin") || "*";

        // Handle CORS preflight
        if (req.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, token, Authorization, X-Requested-With",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }

        const url = new URL(req.url);
        url.pathname = decodeURIComponent(url.pathname);
        const remote_ip = server.requestIP(req)?.address;
        if (!remote_ip) return new Response(null, { status: 400 });

        const cookies = parse_cookie(req.headers.get("cookie") as string);
        const token = (req.headers.get("token") as string) || (cookies.get("token") as string) || url.searchParams.get("token");

        if (req.method === "GET" || req.method === "HEAD") {
            let pathname = url.pathname.replace(/\/+/g, "/");

            // API routes
            if (pathname.startsWith("/api/")) {
                if (!global.rate_limit.check(remote_ip)) {
                    return with_cors(new Response("Too Many Requests", { status: 429 }), req);
                }

                const api_path = pathname.slice(4);

                // SSE endpoint
                if (api_path === "/sse") {
                    const user_info = token ? global.user_sessions.get(token) : null;

                    if (!token || !user_info) {
                        return with_cors(new Response(new ReadableStream({
                            start(controller) {
                                controller.enqueue(
                                    new TextEncoder().encode("data: " + JSON.stringify({
                                        type: 1,
                                        code: "UNAUTHORIZED"
                                    }) + "\n\n")
                                );
                                controller.close();
                            }
                        }), {
                            headers: {
                                "Content-Type": "text/event-stream",
                                "Cache-Control": "no-cache",
                                "Connection": "keep-alive",
                                "Access-Control-Allow-Credentials": "true",
                            }
                        }), req);
                    }

                    return with_cors(new Response(global.sse_clients.add(token, req, user_info), {
                        headers: {
                            "Content-Type": "text/event-stream",
                            "Cache-Control": "no-cache",
                            "Connection": "keep-alive",
                            "Access-Control-Allow-Credentials": "true"
                        } as any,
                    }), req);
                }

                // Normal GET API endpoint
                const user_info = token ? global.user_sessions.get(token) : null;
                if (api_path !== "/public_info" && (!token || !user_info)) {
                    return with_cors(new Response("Unauthorized", { status: 401 }), req);
                }

                const endpoint_function = global.method_cache[`${req.method}:${api_path}`];
                if (!endpoint_function) {
                    return with_cors(new Response("Not Found", { status: 404 }), req);
                }

                try {
                    const res = await endpoint_function(req, url, user_info);
                    return with_cors(res, req);
                } catch (err: any) {
                    console.error("API error:", err);
                    return with_cors(new Response("Internal Server Error", { status: 500 }), req);
                }
            }

            // Profile images
            if (pathname.startsWith("/profile_img/")) {
                const file = Bun.file(pathname.slice(1));
                if (!(await file.exists())) {
                    return with_cors(new Response("Not Found", { status: 404 }), req);
                }
                const ext = pathname.split(".").pop() || "";
                return with_cors(new Response(file.stream(), {
                    status: 200,
                    headers: {
                        "Content-Type": mime_types[ext] || "application/octet-stream",
                        "Cache-Control": "public, max-age=86400",
                    }
                }), req);
            }

            // Static Frontend & SPA Fallback
            let targetPath = `./dist${pathname}`;
            let file = Bun.file(targetPath);
            let exists = await file.exists();

            if (pathname === "/" || pathname === "/index.html") {
                targetPath = "./dist/index.html";
                file = Bun.file(targetPath);
                exists = await file.exists();
            }

            // If the specific file wasn't found, check if it's an SPA route
            if (!exists) {
                const hasExt = pathname.includes(".") && !pathname.endsWith(".html");
                if (!hasExt) {
                    // Fall back to index.html for SPA client-side routing
                    targetPath = "./dist/index.html";
                    file = Bun.file(targetPath);
                    exists = await file.exists();
                }
            }

            if (!exists) {
                return with_cors(new Response("Frontend not found. Please build the frontend with 'bun run build' inside frontend/", {
                    status: 404,
                    headers: { "Content-Type": "text/plain; charset=utf-8" }
                }), req);
            }

            const ext = targetPath.split(".").pop() || "";
            const is_asset = pathname.startsWith("/assets/") || pathname === "/favicon.ico";

            const buffer = new Uint8Array(await file.arrayBuffer());
            const last_modified = file.lastModified;
            const etag = last_modified.toString();

            if (req.headers.get("if-none-match") === etag) {
                return with_cors(new Response(null, { status: 304 }), req);
            }

            const body = req.method === "HEAD" ? null : (buffer as BodyInit);
            return with_cors(new Response(body, {
                status: 200,
                headers: {
                    "Content-Type": (mime_types[ext] || "application/octet-stream") + (ext === "html" ? "; charset=utf-8" : ""),
                    "Strict-Transport-Security": "max-age=300; includeSubDomains; preload",
                    "X-Frame-Options": "DENY",
                    "X-Content-Type-Options": "nosniff",
                    ETag: etag,
                    "Cache-Control": is_asset ? "public, max-age=31536000, immutable" : "no-cache",
                },
            }), req);
        }

        // POST, PATCH, DELETE
        else if (
            req.method === "POST" ||
            req.method === "PATCH" ||
            req.method === "DELETE"
        ) {
            if (!global.rate_limit.check(remote_ip)) {
                return with_cors(new Response("Too Many Requests", { status: 429 }), req);
            }

            const api_path = url.pathname.startsWith("/api/") ? url.pathname.slice(4) : url.pathname;
            const endpoint_function = global.method_cache[`${req.method}:${api_path}`] || global.method_cache[`${req.method}:${url.pathname}`];

            if (!endpoint_function) {
                return with_cors(new Response("Not Found", { status: 404 }), req);
            }

            try {
                const res = await endpoint_function(req, token || "");
                return with_cors(res, req);
            } catch (err: any) {
                console.error("API error:", err);
                return with_cors(new Response("Internal Server Error", { status: 500 }), req);
            }
        }

        return with_cors(new Response("Bad Request", { status: 400 }), req);
    };

    if (Bun.env.APP_USE_TLS && Bun.env.TLS_KEY_PATH !== undefined && Bun.env.TLS_CERT_PATH !== undefined) {
        bun_serve = Bun.serve({
            port: Bun.env.APP_LISTEN_PORT,
            tls: {
                key: Bun.file(Bun.env.TLS_KEY_PATH),
                cert: Bun.file(Bun.env.TLS_CERT_PATH)
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

                if (url.pathname === "/ping") {
                    return new Response("", {
                        headers: {
                            "Access-Control-Allow-Origin": "*"
                        },
                        status: 200,

                    });
                }

                url.protocol = "https:";
                url.port = String(Bun.env.APP_LISTEN_PORT);

                return Response.redirect(url.toString(), 302);
            }
        });
    } else {
        bun_serve = Bun.serve({
            port: Bun.env.APP_LISTEN_PORT,
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