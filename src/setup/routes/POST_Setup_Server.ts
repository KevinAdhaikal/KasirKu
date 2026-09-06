import { current_config } from "..";
import { generate_cert } from "../../utils/utils";

export async function POST_Setup_Server(req: Request) {
    let req_json: Record<string, any>;

    try {
        req_json = await req.json();
    } catch(_) {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", { status: 400 });
    }

    const port = typeof req_json.port === "number" ? req_json.port : Number(req_json.port ?? 0);
    const protocol = typeof req_json.protocol === "string" ? req_json.protocol.trim() : "";
    const compile_html = typeof req_json.compile_html === "boolean" ? req_json.compile_html : null;
    const tls_mode = typeof req_json.tls.mode === "string" ? req_json.tls.mode.trim() : "";

    if (
        !Number.isInteger(port) || port < 1 || port > 65535 ||
        !["http", "https"].includes(protocol) ||
        compile_html === null ||
        !["generate", "upload"].includes(tls_mode)
    ) {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", { status: 400 });
    }
    
    current_config.compile_html = compile_html;
    current_config.listen_port = port;
    current_config.use_tls = protocol === "https"

    if (current_config.use_tls) {
        if (tls_mode === "generate") await generate_cert();
        else {
            const tls_key = typeof req_json.tls.key === "string" ? req_json.tls.key.trim() : "";
            const tls_cert = typeof req_json.tls.certificate === "string" ? req_json.tls.certificate.trim() : "";

            if (!tls_key || !tls_cert) {
                current_config.temp.setup_done = [0, 0, 0, 0];
                return new Response("Bad Request", {status: 400});
            }
        }

        current_config.tls_key_path = "cert/key.pem";
        current_config.tls_cert_path = "cert/cert.pem";
    }

    current_config.temp.setup_done[0] = 1;
    return new Response("", {status: 200});
}