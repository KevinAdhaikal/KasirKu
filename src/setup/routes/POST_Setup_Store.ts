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
    const store_email = typeof req_json.store_email === "string" ? req_json.store_email : "";
    const now = Date.now();

    const settings = [
        {
            section: "store",
            key: "name",
            value: store_name,
            type: "string",
        },
        {
            section: "store",
            key: "desc",
            value: store_desc,
            type: "string",
        },
        {
            section: "store",
            key: "address",
            value: store_address,
            type: "string",
        },
        {
            section: "store",
            key: "phone_num",
            value: store_phone_num,
            type: "string",
        },
        {
            section: "store",
            key: "email",
            value: store_email,
            type: "string",
        },
        {
            section: "store",
            key: "struk",
            value: "",
            type: "string"
        }
    ];

    if (current_config.db_type === "mysql") {
        const conn = current_config.temp.ms_conn;

        await conn.query(
            `INSERT INTO settings
            (\`section\`, \`key\`, \`value\`, \`type\`, \`created_ms\`, \`modified_ms\`)
            VALUES
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?)`,
            [
                settings[0].section,
                settings[0].key,
                settings[0].value,
                settings[0].type,
                now,
                now,

                settings[1].section,
                settings[1].key,
                settings[1].value,
                settings[1].type,
                now,
                now,

                settings[2].section,
                settings[2].key,
                settings[2].value,
                settings[2].type,
                now,
                now,

                settings[3].section,
                settings[3].key,
                settings[3].value,
                settings[3].type,
                now,
                now,

                settings[4].section,
                settings[4].key,
                settings[4].value,
                settings[4].type,
                now,
                now,

                settings[5].section,
                settings[5].key,
                settings[5].value,
                settings[5].type,
                now,
                now
            ]
        );
    }
    else if (current_config.db_type === "postgresql") {
        const conn = current_config.temp.pg_conn;

        await conn.query(
            `INSERT INTO settings ("section", "key", "value", "type", "created_ms", "modified_ms")
            VALUES
                ($1, $2, $3, $4, $5, $5),
                ($6, $7, $8, $9, $10, $10),
                ($11, $12, $13, $14, $15, $15),
                ($16, $17, $18, $19, $20, $20),
                ($21, $22, $23, $24, $25, $25),
                ($26, $27, $28, $29, $30, $30)`,
            [
                settings[0].section,
                settings[0].key,
                settings[0].value,
                settings[0].type,
                now,

                settings[1].section,
                settings[1].key,
                settings[1].value,
                settings[1].type,
                now,

                settings[2].section,
                settings[2].key,
                settings[2].value,
                settings[2].type,
                now,

                settings[3].section,
                settings[3].key,
                settings[3].value,
                settings[3].type,
                now,

                settings[4].section,
                settings[4].key,
                settings[4].value,
                settings[4].type,
                now,

                settings[5].section,
                settings[5].key,
                settings[5].value,
                settings[5].type,
                now
            ]
        );
    }
    else if (current_config.db_type === "sqlite") {
        const conn = current_config.temp.sqlite_conn;
        const stmt = conn.prepare(`INSERT INTO settings (section, key, value, type, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?)`);
        const transaction = conn.transaction(() => {
            for (const setting of settings) stmt.run(setting.section, setting.key, setting.value, setting.type, now, now);
        });
        transaction();
    }
    else {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", {status: 400});
    }

    current_config.temp.setup_done[2] = 1;
    return new Response("", {status: 200});
}