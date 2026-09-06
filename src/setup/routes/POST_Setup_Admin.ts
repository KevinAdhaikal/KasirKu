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

    if (!username || !full_name || !password) {
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
            await conn.query(`INSERT INTO roles (\`name\`, \`permission_level\`, \`created_ms\`, \`modified_ms\`) VALUES (?, ?, ?, ?)`,
                ["Administrator", 1, now, now]
            )
            await conn.query(`INSERT INTO users (\`username\`, \`full_name\`, \`password_hash\`, \`profile_img\`, \`role_id\`, \`created_ms\`, \`modified_ms\`) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [username, full_name, password_hash, null, 1, now, now]
            );
        }

        else if (current_config.db_type === "postgresql") {
            const conn = current_config.temp.pg_conn;
            if (!conn) throw new Error("PostgreSQL connection is not available");

            await conn.query(
                `INSERT INTO roles ("name", "permission_level", "created_ms", "modified_ms") VALUES ($1, $2, $3, $4)`,
                ["Administrator", 1, now, now]
            );
            await conn.query(
                `INSERT INTO users ("username", "full_name", "password_hash", "profile_img", "role_id", "created_ms", "modified_ms") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [username, full_name, password_hash, null, 1, now, now]
            );
        }
        else if (current_config.db_type === "sqlite") {
            const conn = current_config.temp.sqlite_conn;
            if (!conn) throw new Error("SQLite connection is not available");

            let stmt = conn.prepare(`INSERT INTO roles ("name", "permission_level", "created_ms", "modified_ms") VALUES (?, ?, ?, ?)`);
            stmt.run("Administrator", 1, now, now);
            stmt.finalize();
            
            stmt = conn.prepare(`INSERT INTO users (username, full_name, password_hash, profile_img, role_id, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            stmt.run(username, full_name, password_hash, null, 1, now, now);
        }
        else {
            current_config.temp.setup_done = [0, 0, 0, 0];
            return new Response("Bad Request", {status: 400});
        }
    } catch (err) {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response(err instanceof Error ? err.message : "Failed to create admin user", { status: 403 });
    }

    return new Response("", {
        status: 200,
    });
}