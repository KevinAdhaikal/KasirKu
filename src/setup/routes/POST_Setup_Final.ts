import { current_config, stop_server } from "..";

export async function POST_Setup_Final(req: Request) {
    if (current_config.temp.setup_done.every(v => v === 1)) {
        const env = `APP_LISTEN_PORT=${current_config.listen_port}
APP_USE_TLS=${current_config.use_tls}
APP_COMPILE_HTML=${current_config.compile_html}

DB_TYPE=${current_config.db_type}
DB_NAME=${current_config.db_name}

POSTGRES_HOST=${current_config.postgresql.host}
POSTGRES_PORT=${current_config.postgresql.port}
POSTGRES_USER=${current_config.postgresql.user}
POSTGRES_PASSWORD=${current_config.postgresql.password}

MYSQL_HOST=${current_config.mysql.host}
MYSQL_PORT=${current_config.mysql.port}
MYSQL_USER=${current_config.mysql.user}
MYSQL_PASSWORD=${current_config.mysql.password}

TLS_KEY_PATH=${current_config.tls_key_path}
TLS_CERT_PATH=${current_config.tls_cert_path}`;

        if (current_config.db_type === "mysql") await current_config.temp.ms_conn.end();
        else if (current_config.db_type === "postgresql") await current_config.temp.pg_conn.end();
        else if (current_config.db_type === "sqlite") current_config.temp.sqlite_conn.close();
        else {
            current_config.temp.setup_done = [0, 0, 0, 0];
            return new Response("Bad Request", {status: 400});
        }
        
        await Bun.write(".env", env);
        setTimeout(() => { stop_server() }, 100);
        return new Response("", { status: 200 });
    } else {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", { status: 400 });
    }
}