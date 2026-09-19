import { current_config } from "..";

export async function POST_Setup_Store(req: Request) {
    let req_json: Record<string, any>;

    try {
        req_json = await req.json();
    } catch {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", { status: 400 });
    }

    const store_name = typeof req_json.store_name === "string" ? req_json.store_name : "";
    const store_desc = typeof req_json.store_desc === "string" ? req_json.store_desc : "";
    const store_address = typeof req_json.store_address === "string" ? req_json.store_address : "";
    const store_phone_num = typeof req_json.store_phone_num === "string" ? req_json.store_phone_num : "";

    const now = Date.now();

    if (current_config.db_type === "mysql") {
        const conn = current_config.temp.ms_conn;

        await conn.query(`UPDATE settings SET value = ?, created_ms = ?, modified_ms = ? WHERE section = 'store' AND \`key\` = 'name'`,
            [store_name, now, now]
        );
        await conn.query(`UPDATE settings SET value = ?, created_ms = ?, modified_ms = ? WHERE section = 'store' AND \`key\` = 'desc'`,
            [store_desc, now, now]
        );
        await conn.query(`UPDATE settings SET value = ?, created_ms = ?, modified_ms = ? WHERE section = 'store' AND \`key\` = 'address'`,
            [store_address, now, now]
        );
        await conn.query(`UPDATE settings SET value = ?, created_ms = ?, modified_ms = ? WHERE section = 'store' AND \`key\` = 'phone_num'`,
            [store_phone_num, now, now]
        );
    }
    else if (current_config.db_type === "postgresql") {
        const conn = current_config.temp.pg_conn;

        await conn.query(`UPDATE settings SET value = $1, created_ms = $2, modified_ms = $3 WHERE section = 'store' AND "key" = 'name'`,
            [store_name, now, now]
        );
        await conn.query(`UPDATE settings SET value = $1, created_ms = $2, modified_ms = $3 WHERE section = 'store' AND "key" = 'desc'`,
            [store_desc, now, now]
        );
        await conn.query(`UPDATE settings SET value = $1, created_ms = $2, modified_ms = $3 WHERE section = 'store' AND "key" = 'address'`,
            [store_address, now, now]
        );
        await conn.query(`UPDATE settings SET value = $1, created_ms = $2, modified_ms = $3 WHERE section = 'store' AND "key" = 'phone_num'`,
            [store_phone_num, now, now]
        );
    }
    else if (current_config.db_type === "sqlite") {
        const conn = current_config.temp.sqlite_conn;

        conn.run(`UPDATE settings SET value = ?, created_ms = ?, modified_ms = ? WHERE section = 'store' AND "key" = 'name'`,
            [store_name, now, now]
        );
        conn.run(`UPDATE settings SET value = ?, created_ms = ?, modified_ms = ? WHERE section = 'store' AND "key" = 'desc'`,
            [store_desc, now, now]
        );
        conn.run(`UPDATE settings SET value = ?, created_ms = ?, modified_ms = ? WHERE section = 'store' AND "key" = 'address'`,
            [store_address, now, now]
        );
        conn.run(`UPDATE settings SET value = ?, created_ms = ?, modified_ms = ? WHERE section = 'store' AND "key" = 'phone_num'`,
            [store_phone_num, now, now]
        );
    }
    else {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", {status: 400});
    }

    current_config.temp.setup_done[2] = 1;
    return new Response("", {status: 200});
}