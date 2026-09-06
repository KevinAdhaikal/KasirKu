import { sql_connection } from "../../utils/utils";

export async function POST_Test_Connection(req: Request) {
    let req_json: Record<string, unknown>;

    try {
        req_json = await req.json();
    } catch {
        return new Response("Bad Request", { status: 400 });
    }

    const db_type = typeof req_json.type === "string" ? req_json.type.trim() : "";
    const db_host = typeof req_json.host === "string" ? req_json.host.trim() : "";
    const db_port = typeof req_json.port === "number" ? req_json.port : Number(req_json.port ?? 0);
    const db_name = typeof req_json.name === "string" ? req_json.name.trim() : "";
    const db_user = typeof req_json.user === "string" ? req_json.user.trim() : "";
    const db_pass = typeof req_json.pass === "string" ? req_json.pass : "";
    
    if (!db_type || !db_host || !Number.isInteger(db_port) || db_port < 1 || db_port > 65535 || !db_name || !db_user) {
        return new Response("Bad Request", { status: 400 });
    }
    
    const identifierRegex = /^[a-zA-Z0-9_-]+$/;
    if (!identifierRegex.test(db_name)) return new Response("Bad Request", { status: 400 });
    if (!identifierRegex.test(db_user)) return new Response("Bad Request", { status: 400 });

    const sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);

    if (sql_conn.ms_conn && sql_conn.pg_conn) return new Response(sql_conn.message, {status: 403});

    sql_conn.ms_conn !== null ? await sql_conn.ms_conn.end() : await sql_conn.pg_conn?.end();

    return new Response("", {status: 200});
}