import { user_session } from "./user_session/user_session";
import { mutex } from "./utils/utils";
import { sse_server } from "./sse_server/sse_server";
import { rate_limit } from "./rate_limit/rate_limit";
import { Kysely } from "kysely";

export const global = {
    // Date
    date: new Date(),

    // user sessions
    user_sessions: new user_session(600, 60, 32),

    // sse clients
    sse_clients: new sse_server(5000),

    // password hash variable
    ph_memorycost: 1024,
    ph_timecost: 2,
    ph_text: `$argon2id$v=19$m=1024,t=2,p=`,

    // mutex (mutual expression)
    mutex: new mutex(),

    // rate limit (max req 100/10 seconds. jail for 25 seconds)
    rate_limit: new rate_limit(10, 100, 5),

    // Database
    database: null as unknown as Kysely<any>,

    // static cache for file
    static_cache: new Map() as Map<string, {buffer: Uint8Array, last_modified: number}>,

    // config file
    config: {
        "listen_port": 443,
        "compile_html": false,
        "db_type": "sqlite",
        "db_name": "kasirku",
        "postgresql": {
            "host": "127.0.0.1",
            "port": 5432,
            "user": "root",
            "password": "admin"
        },
        "mysql": {
            "host": "127.0.0.1",
            "port": 3306,
            "user": "root",
            "password": "root"
        }
    },

    // Permissions
    permissions: {
        ADMINISTRATOR: 1 << 0,
        MANAGE_BARANG: 1 << 1,
        KASIR: 1 << 2,
        MANAGE_PEMBUKUAN: 1 << 3,
        DASHBOARD: 1 << 4
    }
}