import { current_config } from "..";
import { global } from "../../global";
import { get_password_hash_only } from "../../utils/utils";

export async function POST_Setup_Admin(req: Request) {
    let req_json: Record<string, any>;

    try {
        req_json = await req.json();
    } catch {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", { status: 400 });
    }

    const username = typeof req_json.username === "string" ? req_json.username.trim() : "";
    const full_name = typeof req_json.full_name === "string" ? req_json.full_name.trim() : "";
    const password = typeof req_json.password === "string" ? req_json.password : "";
    const confirm_password = typeof req_json.confirm_password === "string" ? req_json.confirm_password : "";

    if (
        !username ||
        !full_name ||
        !password || password !== confirm_password
    ) {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", { status: 400 });
    }

    const password_hash = get_password_hash_only(
        Bun.password.hashSync(password, {
            algorithm: "argon2id",
            timeCost: global.ph_timecost,
            memoryCost: global.ph_memorycost,
        })
    );

    const now = Date.now();

    try {
        if (current_config.db_type === "mysql") {
            const conn = current_config.temp.ms_conn;
            if (!conn) throw new Error("MySQL connection is not available");

            await conn.query(`UPDATE users SET username = ?, full_name = ?, password_hash = ?, created_ms = ?, modified_ms = ? WHERE username = "admin"`,
                [username, full_name, password_hash, now, now]
            );
        }
        else if (current_config.db_type === "postgresql") {
            const conn = current_config.temp.pg_conn;
            if (!conn) throw new Error("PostgreSQL connection is not available");

            await conn.query(`UPDATE users SET username = $1, full_name = $2, password_hash = $3, created_ms = $4, modified_ms = $5 WHERE username = "admin"`,
                [username, full_name, password_hash, now, now]
            );
        }
        else if (current_config.db_type === "sqlite") {
            const conn = current_config.temp.sqlite_conn;
            if (!conn) throw new Error("SQLite connection is not available");

            conn.run(`UPDATE users SET username = ?, full_name = ?, password_hash = ?, created_ms = ?, modified_ms = ? WHERE username = "admin"`,
                [username, full_name, password_hash, now, now]
            )
        }
        else {
            current_config.temp.setup_done = [0, 0, 0, 0];
            return new Response("Bad Request", {status: 400});
        }
    } catch (err: any) {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response(err.message, {status: 403});
    }

    current_config.temp.setup_done[3] = 1;
    return new Response("", {status: 200});
}