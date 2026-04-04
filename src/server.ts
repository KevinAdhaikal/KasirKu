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
        bun_serve2.stop();

        if (global.database) await global.database.destroy();

        global.sse_clients.destroy();
        global.rate_limit.destroy();
        global.user_sessions.destroy();

        reader.cancel();
        
        console.log("[LOG] Server has been stopped!");
    }
}

export function main() {
    console.log(`[LOG] HTTPS Server running in port ${global.config.listen_port}`);

    bun_serve = Bun.serve({
        port: global.config.listen_port,
        tls: {
            key: Bun.file("cert/key.pem"),
            cert: Bun.file("cert/cert.pem")
        },
        async fetch(req: Request, server) {
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
        },
        error(err: Error) {
            console.log(err);
            return new Response("Internal Server Error", {status: 500});
        }
    })

    bun_serve2 = Bun.serve({
        port: 80,
        async fetch(req: Request) {
            const url = new URL(req.url);

            url.protocol = "https:";
            url.port = String(global.config.listen_port);

            return Response.redirect(url.toString(), 302);
        }
    });
    process.on("SIGINT", async () => {await stop_server()});
    process.on("SIGTERM", async () => {await stop_server()});
}