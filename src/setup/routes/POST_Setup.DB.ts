import { current_config } from "..";
import { sql_connection } from "../../utils/utils";
import { mkdir } from "node:fs/promises";
import { Database } from "bun:sqlite";

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
    let db_new_migrate = typeof req_json.db_new_migrate === "boolean" ? req_json.db_new_migrate : null;

    if (!db_type) {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", { status: 400 });
    }

    if (["postgresql", "mysql"].includes(db_type)) {
        if (!db_host || !Number.isInteger(db_port) || db_port < 1 || db_port > 65535 || !db_name || !db_user) {
            current_config.temp.setup_done = [0, 0, 0, 0];
            return new Response("Bad Request", {status: 400});
        }
        
        let sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
        if (sql_conn.ms_conn === null && sql_conn.pg_conn === null) {
            current_config.temp.setup_done = [0, 0, 0, 0];
            return new Response(sql_conn.message, {status: 403});
        }

        if (db_new_migrate) { // orang nya pengen migrate. tapi sebelum migrate, kita cek dulu. ada ga?
            try {
                await (
                    sql_conn.ms_conn
                    ? sql_conn.ms_conn.query("SELECT 1 FROM kasirku WHERE k = 'version' LIMIT 1")
                    : sql_conn.pg_conn?.query("SELECT 1 FROM kasirku WHERE k = 'version' LIMIT 1")
                );
            } catch(_) {
                db_new_migrate = false;
                // wah, ternyata gaada. ternyata dia pengen coba nipuk nih. kita switch ke false, wleeee
            }
        }

        let migrated_data: {
            kategori_barang: any[];
            barang: any[];
            barang_masuk: any[];
            penjualan: any[];
            penjualan_item: any[];
            pembukuan: any[];
            retur_barang: any[];
        } | null = null;

        if (sql_conn.ms_conn) {
            if (db_new_migrate) {
                try {
                    const [kategori_barang_rows] = await sql_conn.ms_conn.query("SELECT * FROM kategori_barang");
                    const [barang_rows] = await sql_conn.ms_conn.query("SELECT * FROM barang");
                    const [barang_masuk_rows] = await sql_conn.ms_conn.query("SELECT * FROM barang_masuk");
                    const [penjualan_rows] = await sql_conn.ms_conn.query("SELECT * FROM penjualan");
                    const [penjualan_item_rows] = await sql_conn.ms_conn.query("SELECT * FROM penjualan_item");
                    const [pembukuan_rows] = await sql_conn.ms_conn.query("SELECT * FROM pembukuan");
                    const [retur_barang_rows] = await sql_conn.ms_conn.query("SELECT * FROM retur_barang");

                    migrated_data = {
                        kategori_barang: kategori_barang_rows as unknown[],
                        barang: barang_rows as unknown[],
                        barang_masuk: barang_masuk_rows as unknown[],
                        penjualan: penjualan_rows as unknown[],
                        penjualan_item: penjualan_item_rows as unknown[],
                        pembukuan: pembukuan_rows as unknown[],
                        retur_barang: retur_barang_rows as unknown[],
                    };
                } catch(e) {
                    db_new_migrate = false;
                }
                
                await sql_conn.ms_conn.end();
                sql_conn = await sql_connection(db_type, db_host, db_port, "", db_user, db_pass);
                await sql_conn.ms_conn?.query(`CREATE DATABASE "${db_name}"`);
                await sql_conn.ms_conn?.end();
                sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
            }

            const { drizzle } = await import("drizzle-orm/mysql2");
            const { migrate } = await import("drizzle-orm/mysql2/migrator");
            const db = drizzle(sql_conn.ms_conn!);
            await migrate(db, {
                migrationsFolder: "./database/migrations/postgresql",
            });

            if (db_new_migrate && migrated_data) {
                /*await sql_conn.ms_conn?.query("BEGIN");
                try {
                    await insert_rows_mysql(sql_conn.ms_conn!, "kategori_barang", migrated_data.kategori_barang);

                    await sql_conn.ms_conn?.query("COMMIT");
                } catch (error) {
                    await sql_conn.ms_conn?.query("ROLLBACK");
                    throw error;
                }*/
            }
            
            current_config.db_type = "mysql";
            current_config.db_name = db_name;

            current_config.mysql.host = db_host;
            current_config.mysql.port = db_port;
            current_config.mysql.user = db_user;
            current_config.mysql.password = db_pass;

            current_config.temp.ms_conn = sql_conn.ms_conn!;

            current_config.temp.setup_done[1] = 1;
        } else {
            if (db_new_migrate) {
                try {
                    const { rows: kategori_barang_rows } = await sql_conn.pg_conn!.query("SELECT * FROM kategori_barang");
                    const { rows: barang_rows } = await sql_conn.pg_conn!.query("SELECT * FROM barang");
                    const { rows: barang_masuk_rows } = await sql_conn.pg_conn!.query("SELECT * FROM barang_masuk");
                    const { rows: penjualan_rows } = await sql_conn.pg_conn!.query("SELECT * FROM penjualan");
                    const { rows: penjualan_item_rows } = await sql_conn.pg_conn!.query("SELECT * FROM penjualan_item");
                    const { rows: pembukuan_rows } = await sql_conn.pg_conn!.query("SELECT * FROM pembukuan");
                    const { rows: retur_barang_rows } = await sql_conn.pg_conn!.query("SELECT * FROM retur_barang");

                    migrated_data = {
                        kategori_barang: kategori_barang_rows,
                        barang: barang_rows,
                        barang_masuk: barang_masuk_rows,
                        penjualan: penjualan_rows,
                        penjualan_item: penjualan_item_rows,
                        pembukuan: pembukuan_rows,
                        retur_barang: retur_barang_rows,
                    };
                } catch(e) {
                    db_new_migrate = false;
                }
            
                await sql_conn.pg_conn?.end();
                sql_conn = await sql_connection(db_type, db_host, db_port, "", db_user, db_pass);
                await sql_conn.pg_conn?.query(`CREATE DATABASE "${db_name}"`);
                await sql_conn.pg_conn?.end();
                sql_conn = await sql_connection(db_type, db_host, db_port, db_name, db_user, db_pass);
            }

            const { drizzle } = await import("drizzle-orm/node-postgres");
            const { migrate } = await import("drizzle-orm/node-postgres/migrator");
            const db = drizzle(sql_conn.pg_conn!);
            await migrate(db, {
                migrationsFolder: "./database/migrations/postgresql",
            });

            if (db_new_migrate && migrated_data) {
                /*await sql_conn.pg_conn?.query("BEGIN");
                try {
                    await insert_rows_pg(sql_conn.pg_conn!, "kategori_barang", migrated_data.kategori_barang);

                    await sql_conn.pg_conn?.query("COMMIT");
                } catch (error) {
                    await sql_conn.pg_conn?.query("ROLLBACK");
                    throw error;
                }*/
            }

            current_config.db_type = "postgresql";
            current_config.db_name = db_name;

            current_config.postgresql.host = db_host;
            current_config.postgresql.port = db_port;
            current_config.postgresql.user = db_user;
            current_config.postgresql.password = db_pass;

            current_config.temp.pg_conn = sql_conn.pg_conn!;

            current_config.temp.setup_done[1] = 1;
        }
    }
    else if (db_type === "sqlite") {
        const { drizzle } = await import("drizzle-orm/bun-sqlite");
        const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");

        await mkdir("database", { recursive: true });
        const sql_conn = new Database(`database/${db_name}.db`);
        const db = drizzle(sql_conn);

        migrate(db, {
            migrationsFolder: "./database/migrations/sqlite",
        });

        current_config.db_type = "sqlite";
        current_config.db_name = db_name;
        current_config.temp.sqlite_conn = sql_conn;
        
        current_config.temp.setup_done[1] = 1;
    }
    else {
        current_config.temp.setup_done = [0, 0, 0, 0];
        return new Response("Bad Request", {status: 400});
    }

    return new Response("", {status: 200});
}