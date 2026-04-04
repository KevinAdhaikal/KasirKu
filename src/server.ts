// HTTP Method
import { get_method } from "./method_function/get_method";
import { post_method } from "./method_function/post_method";
import { patch_method } from "./method_function/patch_method";
import { delete_method } from "./method_function/delete_method";
import { global } from "./global";
import { reader } from "./utils/utils";

let is_server_closed = false;
let bun_serve: any;
let bun_serve2: any;

async function stop_server() {
    if (!is_server_closed) {
        is_server_closed = true;

        console.log("[LOG] Stopping Server...");

        bun_serve.stop();
        if (bun_serve2) {
            bun_serve2.stop();
        }

        if (global.database) {
            await global.database.destroy();
        }

        global.sse_clients.destroy();
        global.rate_limit.destroy();
        global.user_sessions.destroy();

        reader.cancel();
        
        console.log("[LOG] Server has been stopped!");
    }
}

export function main() {
    const protocol = global.config.use_tls ? "HTTPS" : "HTTP";
    console.log(`[LOG] ${protocol} Server running in port ${global.config.listen_port}`);

    const tls_key_path = global.config.tls_key_path;
    const tls_cert_path = global.config.tls_cert_path;

    const fetch_handler = async (req: Request, server: any) => {
        const url = new URL(req.url);
        url.pathname = decodeURIComponent(url.pathname);
        const remote_ip = server.requestIP(req)?.address;
        if (!remote_ip) return new Response(null, {status: 400});

        switch(req.method) {
            case "GET": return await get_method(req, url, remote_ip);
            case "POST": {
                if (!global.rate_limit.check(remote_ip)) return new Response("Too Many Requests", {status: 429});
                return await post_method(req, url);
            }
            case "PATCH": {
                if (!global.rate_limit.check(remote_ip)) return new Response("Too Many Requests", {status: 429});
                return await patch_method(req, url);
            }
            case "DELETE": {
                if (!global.rate_limit.check(remote_ip)) return new Response("Too Many Requests", {status: 429});
                return await delete_method(req, url);
            }
        }
        return new Response("Bad request", {status: 400});
    };

    if (global.config.use_tls) {
        bun_serve = Bun.serve({
            port: global.config.listen_port,
            tls: {
                key: Bun.file(tls_key_path),
                cert: Bun.file(tls_cert_path)
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