import { current_config } from "..";
import { sql_connection } from "../../utils/utils";
import { mkdir } from "node:fs/promises";
import { Database } from "bun:sqlite";
import { migrate_up } from "../../database/migrate";

export async function POST_Setup_DB(req: Request) {
    let req_json: Record<string, any>;

    try {
        req_json = await req.json();
    } catch {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", { status: 400 });
    }

    const db_type = typeof req_json.type === "string" ? req_json.type.trim() : "";
    const db_host = typeof req_json.host === "string" ? req_json.host.trim() : "";
    const db_port = typeof req_json.port === "number" ? req_json.port : Number(req_json.port ?? 0);
    const db_name = typeof req_json.name === "string" ? req_json.name.trim() : "";
    const db_user = typeof req_json.user === "string" ? req_json.user.trim() : "";
    const db_pass = typeof req_json.pass === "string" ? req_json.pass : "";

    if (!db_type) {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", { status: 400 });
    }

    if (["postgresql", "mysql"].includes(db_type)) {
        if (!db_host || !Number.isInteger(db_port) || db_port < 1 || db_port > 65535 || !db_name || !db_user) {
            current_config.temp.setup_done = [0, 0, 0, 0];
            return new Response("Bad Request", {status: 400});
        }
        
        let sql_conn;
        try {
            sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
            if (sql_conn.ms_conn === null && sql_conn.pg_conn === null) {
                current_config.temp.setup_done = [0, 0, 0, 0];
                return new Response(sql_conn.message, {status: 403});
            }

            if (sql_conn.ms_conn) { // mysql
                const { drizzle } = await import("drizzle-orm/mysql2");
                const db = drizzle({ client: sql_conn.ms_conn });
                await migrate_up(db, "mysql");

                current_config.db_type = "mysql";
                current_config.db_name = db_name;

                current_config.mysql.host = db_host;
                current_config.mysql.port = db_port;
                current_config.mysql.user = db_user;
                current_config.mysql.password = db_pass;

                current_config.temp.ms_conn = sql_conn.ms_conn!;
            } else { // postgresql
                const { drizzle } = await import("drizzle-orm/node-postgres");
                const db = drizzle({ client: sql_conn.pg_conn! });
                await migrate_up(db, "postgresql");

                current_config.db_type = "postgresql";
                current_config.db_name = db_name;

                current_config.postgresql.host = db_host;
                current_config.postgresql.port = db_port;
                current_config.postgresql.user = db_user;
                current_config.postgresql.password = db_pass;

                current_config.temp.pg_conn = sql_conn.pg_conn!;
            }
        } catch(e: any) {
            current_config.temp.setup_done = [0, 0, 0, 0];
            await (sql_conn!.ms_conn === null ? sql_conn!.pg_conn?.end() : sql_conn!.ms_conn?.end());
            return new Response(e.message, {status: 500});
        }
    }
    else if (db_type === "sqlite") {
        await mkdir("database", { recursive: true });

        let sql_conn;

        try {
            sql_conn = new Database(`database/${db_name}.db`);
            const { drizzle } = await import("drizzle-orm/bun-sqlite");
            const db = drizzle({ client: sql_conn });
            await migrate_up(db, "sqlite");

            current_config.db_type = "sqlite";
            current_config.db_name = db_name;
            current_config.temp.sqlite_conn = sql_conn;
        } catch(e: any) {
            current_config.temp.setup_done = [0, 0, 0, 0];
            sql_conn?.close();
            return new Response(e.message, { status: 500 });
        }
    }
    else {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", {status: 400});
    }

    current_config.temp.setup_done[1] = 1;
    return new Response("", {status: 200});
}