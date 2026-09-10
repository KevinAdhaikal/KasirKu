import { sql_connection } from "../../utils/utils";
import { Database } from "bun:sqlite";

export async function POST_Check_Old_DB(req: Request) {
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

    if (["postgresql", "mysql"].includes(db_type)) {
        if (!db_host || !Number.isInteger(db_port) || db_port < 1 || db_port > 65535 || !db_name || !db_user) {
            return new Response("Bad Request", {status: 400});
        }
        
        const sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
        if (sql_conn.ms_conn === null && sql_conn.pg_conn === null) return new Response(sql_conn.message, {status: 403});

        try {
            await (
                sql_conn.ms_conn
                ? sql_conn.ms_conn.query("SELECT v FROM kasirku WHERE k = 'version' LIMIT 1")
                : sql_conn.pg_conn?.query("SELECT v FROM kasirku WHERE k = 'version' LIMIT 1")
            );
        } catch(_) {
            return new Response("", {status: 201});
        }
    }
    else if (db_type === "sqlite") {
        if (!await Bun.file("./database/kasirku.db").exists()) return new Response("", {status: 201});

        const db = new Database("./database/kasirku.db");
        try {
            if (!db.query("SELECT 1 FROM kasirku WHERE k = 'version' LIMIT 1").get()) {
                db.close();
                return new Response("", {status: 201});
            }
        } catch(_) {
            db.close();
            return new Response("", {status: 201});
        }
        
        db.close();
    }
    else return new Response("Bad Request", {status: 400});

    return new Response("", {status: 200});
}