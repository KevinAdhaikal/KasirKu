import { check_certificate } from "../../utils/utils";

export async function POST_Check_Cert(req: Request) {
    let req_json: Record<string, unknown>;

    try {
        req_json = await req.json();
    } catch {
        return new Response("Bad Request", { status: 400 });
    }

    const cert = typeof req_json.cert === "string" ? req_json.cert.trim() : "";
    const key = typeof req_json.key === "string" ? req_json.key.trim() : "";

    if (!cert || !key) return new Response("Bad Reuqest", {status: 400});

    const res = check_certificate(cert, key);
    return new Response("", {status: res ? 200 : 403});
}