import { readdir, mkdir } from "node:fs/promises";
import { ColumnDefinitionBuilder, InsertQueryBuilder, InsertResult, Kysely, MysqlDialect, PostgresDialect, sql } from "kysely";
import { main } from "./src/server";
import { global } from "./src/global";
import { BunSqliteDialect, get_password_hash_only, user_input } from "./src/utils/utils";

let default_svg_profile_img = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 15.1.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
	<!ENTITY st0 "fill:#B3B3B3;">
]>
<svg version="1.1" id="Ebene_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 width="50px" height="75px" viewBox="0 0 50 75" style="enable-background:new 0 0 50 75;" xml:space="preserve">
<circle style="&st0;" cx="25" cy="16.726" r="16.725"/>
<path style="&st0;" d="M49.998,75V53.872c0-8.497-6.889-15.385-15.385-15.385H15.384c-8.496,0-15.386,6.888-15.386,15.385V75H49.998
	z"/>
</svg>` // https://upload.wikimedia.org/wikipedia/commons/4/4b/User-Pict-Profil.svg

const MAX_CONCURRENT = 8;

let insert_ignore: (q: InsertQueryBuilder<any, any, InsertResult>) => InsertQueryBuilder<any, any, InsertResult> = (q) => {return q.ignore()}
let id_column: (col: ColumnDefinitionBuilder) => ColumnDefinitionBuilder;

async function process_file(full_path: string) {
    const stat_file = await Bun.file(full_path).stat();
    let need_compile = false

    const build_path = full_path.replace("html/", "html_build/")

    try {
        const stat_build = await Bun.file(build_path).stat();
        if (stat_file.mtime > stat_build.mtime) need_compile = true
    } catch {
        need_compile = true
    }

    if (!need_compile) return

    // HTML, JS, and CSS Minifier and Compression.
    const { minify: minifyHTML } = await import("html-minifier-terser");
    const { minify: minifyJS } = await import("terser");
    const CleanCSS = (await import("clean-css")).default;
    const { brotliCompressSync } = await import("node:zlib");

    console.log("[BUILD]", full_path)

    let res: any;

    if (full_path.endsWith(".html")) {
        res = await minifyHTML(await Bun.file(full_path).text(), {
            collapseWhitespace: true,
            removeComments: true,
            removeOptionalTags: true,
            collapseBooleanAttributes: true,
            minifyCSS: true,
            minifyJS: true
        })
    }
    else if (full_path.endsWith(".js") && !full_path.endsWith(".min.js")) {
        const res_js = await minifyJS(await Bun.file(full_path).text())
        res = res_js.code
    }
    else if (full_path.endsWith(".css") && !full_path.endsWith(".min.css")) {
        const res_css = new CleanCSS().minify(await Bun.file(full_path).text())
        res = res_css.styles
    }
    else {
        res = await Bun.file(full_path).arrayBuffer()
    }

    await Bun.write(build_path, brotliCompressSync(res))
}

async function scan_html_file(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })
    const tasks: Promise<any>[] = []

    for (const entry of entries) {
        const full_path = dir + "/" + entry.name

        if (entry.isDirectory()) {
            tasks.push(scan_html_file(full_path));
            continue;
        }

        tasks.push(process_file(full_path))

        if (tasks.length >= MAX_CONCURRENT) {
            await Promise.all(tasks)
            tasks.length = 0
        }
    }

    if (tasks.length) {
        await Promise.all(tasks)
    }
}

async function database_create_req(db: Kysely<any>, version: number, current_ms: number) { // database create requirement
    if (version < 1) { // Database Version 1.0
        // roles
        await db.schema
        .createTable("roles")
        .ifNotExists()
        .addColumn("id", "integer", col => id_column(col))
        .addColumn("name", "varchar(255)", col => col.unique())
        .addColumn("permission_level", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .execute();

        await insert_ignore(db.insertInto("roles").values({
            name: "Administrator",
            permission_level: global.permissions.ADMINISTRATOR,
            created_ms: current_ms,
            modified_ms: current_ms
        })).execute();

        // users
        await db.schema
        .createTable("users")
        .ifNotExists()
        .addColumn("id", "integer", col => id_column(col))
        .addColumn("username", "varchar(255)", col => col.unique())
        .addColumn("full_name", "text")
        .addColumn("password_hash", "text")
        .addColumn("profile_img", "text", col => col.defaultTo(null))
        .addColumn("role_id", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "users_role_fk", // nama constraint nya (kalo di sqlite mah di ignore)
            ["role_id"],
            "roles",
            ["id"],
            (cb) => cb.onDelete("cascade").onUpdate("cascade")
        )
        .execute();

        await insert_ignore(db.insertInto("users").values({
            username: "admin",
            full_name: "Administrator",
            password_hash: get_password_hash_only(
                Bun.password.hashSync("admin", {
                    algorithm: "argon2id",
                    timeCost: global.ph_timecost,
                    memoryCost: global.ph_memorycost,
                }),
            ),
            role_id: 1,
            created_ms: current_ms,
            modified_ms: current_ms
        })).execute();

        // kategori barang
        await db.schema
        .createTable("kategori_barang")
        .ifNotExists()
        .addColumn("id", "integer", col => id_column(col))
        .addColumn("nama_kategori", "text", col => col.unique())
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .execute();

        await insert_ignore(db.insertInto("kategori_barang")
        .values({
            nama_kategori: "Tidak Ada",
            created_ms: current_ms,
            modified_ms: current_ms
        })).execute();

        // barang
        await db.schema
        .createTable("barang")
        .ifNotExists()
        .addColumn("id", "integer", col => id_column(col))
        .addColumn("nama_barang", "text")
        .addColumn("stok_barang", "integer")
        .addColumn("kategori_barang_id", "integer")
        .addColumn("harga_modal", "integer")
        .addColumn("harga_jual", "integer")
        .addColumn("barcode_barang", "text", col => col.unique().defaultTo(null))
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "barang_kategori_fk",
            ["kategori_barang_id"],
            "kategori_barang",
            ["id"],
            (cb) => cb.onDelete("cascade").onUpdate("cascade")
        )
        .execute();

        // barang masuk
        await db.schema
        .createTable("barang_masuk")
        .ifNotExists()
        .addColumn("id", "integer", col => id_column(col))
        .addColumn("barang_id", "integer")
        .addColumn("deskripsi", "text")
        .addColumn("jumlah_barang", "integer")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "fk_barang_masuk_barang",
            ["barang_id"],
            "barang",
            ["id"],
            cb => cb.onDelete("cascade").onUpdate("cascade")
        )
        .execute();

        // penjualan
        await db.schema
        .createTable("penjualan")
        .ifNotExists()
        .addColumn("id", "integer", col => id_column(col))
        .addColumn("total_barang", "integer")
        .addColumn("total_harga_modal", "integer")
        .addColumn("total_harga_jual", "integer")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .execute();

        // penjualan_item
        await db.schema
        .createTable("penjualan_item")
        .ifNotExists()
        .addColumn("id", "integer", col => id_column(col))
        .addColumn("penjualan_id", "integer", col => col.notNull())
        .addColumn("barang_id", "integer", col => col.notNull())
        .addColumn("nama_barang", "text")
        .addColumn("jumlah", "bigint")
        .addColumn("harga_modal", "bigint")
        .addColumn("harga_jual", "bigint")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "fk_penjualan_item_penjualan",
            ["penjualan_id"],
            "penjualan",
            ["id"],
            cb => cb.onDelete("cascade").onUpdate("cascade")
        )
        .execute();

        // pembukuan
        await db.schema
        .createTable("pembukuan")
        .ifNotExists()
        .addColumn("id", "integer", col => id_column(col))
        .addColumn("tipe", "integer", col => col.check(sql`tipe IN (0,1)`))
        .addColumn("deskripsi", "text", col => col.defaultTo(null))
        .addColumn("jumlah_uang", "integer")
        .addColumn("referensi_id", "integer")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .execute();
    }
}

function print_config(config: any) {
    console.log("[LOG] ============================================");
    console.log(`[LOG] Listening Port HTTPS: ${config.listen_port}`);
    console.log(`[LOG] Compile assets saat startup: ${config.compile_html}`);
    console.log(`[LOG] Database Type: ${config.db_type}`);
    console.log(`[LOG] Database Name : ${config.db_name}`);
    
    if (global.config.db_type === "postgresql") {
        console.log("[LOG]");
        console.log("[LOG] PostgreSQL");
        console.log(`[LOG] host: ${config.postgresql.host}`);
        console.log(`[LOG] port: ${config.postgresql.port}`);
        console.log(`[LOG] user: ${config.postgresql.user}`);
        console.log(`[LOG] pass: ${config.postgresql.password}`);
    }
    else if (global.config.db_type === "mysql") {
        console.log("[LOG]");
        console.log("[LOG] MySQL");
        console.log(`[LOG] Host: ${config.mysql.host}`);
        console.log(`[LOG] Port: ${config.mysql.port}`);
        console.log(`[LOG] Username: ${config.mysql.user}`);
        console.log(`[LOG] Password: ${config.mysql.password}`);
    }

    console.log("[LOG] ============================================");
}

async function check_config() {
    if (!(await Bun.file("config.json").exists())) {
        console.log("[LOG] Config file not found!");

        while(1) {
            const answer = await user_input("[LOG] Gunakan konfigurasi default (y/n) ");

            if (answer.toLowerCase() === "n") {
                let port = await user_input("[LOG] Masukkan port HTTPS (Default: 443): ");
                if (port) global.config.listen_port = Number(port);

                let compile_html = await user_input("[LOG] Compile assets saat startup? (true/false) (Default: false): ");
                if (compile_html) global.config.compile_html = compile_html.toLowerCase() === "true";

                let db_type = await user_input("[LOG] Pilih database (sqlite / mysql / postgresql) (Default: sqlite): ");
                if (db_type) global.config.db_type = db_type.toLowerCase();

                let db_name = await user_input("[LOG] Nama database (Default: kasirku): ");
                if (db_name) global.config.db_name = db_name.toLowerCase();

                if (db_name === "postgresql") {
                    console.log("[LOG] Konfigurasi PostgreSQL");
                    let pg_host = await user_input("[LOG] PostgreSQL host (Default: 127.0.0.1): ");
                    if (pg_host) global.config.postgresql.host = pg_host;

                    let pg_port = await user_input("[LOG] PostgreSQL port (Default: 5432): ");
                    if (pg_port) global.config.postgresql.port = Number(pg_port);

                    let pg_user = await user_input("[LOG] PostgreSQL user (Default: root): ");
                    if (pg_user) global.config.postgresql.user = pg_user;

                    let pg_pass = await user_input("[LOG] PostgreSQL password (Default: admin): ");
                    if (pg_pass) global.config.postgresql.password = pg_pass;
                }

                if (db_name === "mysql") {
                    console.log("[LOG] Konfigurasi MySQL");
                    let mysql_host = await user_input("[LOG] MySQL host (Default: 127.0.0.1): ");
                    if (mysql_host) global.config.mysql.host = mysql_host;

                    let mysql_port = await user_input("[LOG] MySQL port (Default: 3306): ");
                    if (mysql_port) global.config.mysql.port = Number(mysql_port);

                    let mysql_user = await user_input("[LOG] MySQL user (Default: root): ");
                    if (mysql_user) global.config.mysql.user = mysql_user;

                    let mysql_pass = await user_input("[LOG] MySQL password (Default: root): ");
                    if (mysql_pass) global.config.mysql.password = mysql_pass;
                }
            }

            print_config(global.config);

            if ((await user_input("[LOG] Apakah konfigurasi ini sudah benar? (y/n) ")).toLowerCase() === "y") break;
        }

        await Bun.file("config.json").write(JSON.stringify(global.config, null, 4));
        console.log("[LOG] Config file has been created");
    } else {
        global.config = await Bun.file("config.json").json();
        print_config(global.config);
    }
}

async function prepare() {
    console.log("[LOG] Preparing Server...");

    await check_config();

    if (global.config.compile_html) {
       try {
            await mkdir("html_build");
        } catch(e) {}

        await scan_html_file("html");
    }

    switch(global.config.db_type) {
        case "sqlite": {
            const { Database } = await import("bun:sqlite");
            if (!(await Bun.file(`database/${global.config.db_name}.db`).exists())) {
                try {
                    await mkdir("database");
                } catch(e) {
                    console.log("[WARNING]:", e)
                }
            }

            global.database = new Kysely({
                dialect: new BunSqliteDialect({
                    database: new Database(`database/${global.config.db_name}.db`)
                })
            });

            id_column = col => col.primaryKey();
            break;
        }
        case "mysql": {
            const { createConnection } = await import("mysql2/promise");
            const { createPool } = await import("mysql2");
            const tmp_conn = await createConnection({
                host: global.config.mysql.host,
                user: global.config.mysql.user,
                password: global.config.mysql.password
            })
            await tmp_conn.query(`CREATE DATABASE IF NOT EXISTS ${global.config.db_name}`);
            await tmp_conn.end();

            global.database = new Kysely<any>({
                dialect: new MysqlDialect({
                    pool: createPool({
                        host: global.config.mysql.host,
                        port: global.config.mysql.port,
                        user: global.config.mysql.user,
                        password: global.config.mysql.password,
                        database: global.config.db_name
                    })
                })
            })

            id_column = col => col.primaryKey().autoIncrement();
            break;
        }
        case "postgresql": {
            const { Client, Pool } = await import("pg");

            const client = new Client({
                host: global.config.postgresql.host,
                port: global.config.postgresql.port,
                user: global.config.postgresql.user,
                password: global.config.postgresql.password,
                database: "postgres"
            });

            await client.connect();

            const check = await client.query(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [global.config.db_name]
            );
            if (check.rowCount === 0) await client.query(`CREATE DATABASE "${global.config.db_name}"`);

            await client.end();

            global.database = new Kysely<any>({
                dialect: new PostgresDialect({
                    pool: new Pool({
                        host: global.config.postgresql.host,
                        port: global.config.postgresql.port,
                        user: global.config.postgresql.user,
                        password: global.config.postgresql.password,
                        database: global.config.db_name
                    })
                })
            })

            insert_ignore = (q) => {return  q.onConflict(oc => oc.doNothing())};
            id_column = col => col.primaryKey().generatedAlwaysAsIdentity();
            break;
        }
        default: {
            console.log("[ERROR] Unknown database type:", global.config.db_type);
            process.exit(0);
        }
    }

    // Preapre Profile Image Folder
    if (!(await Bun.file("profile_img/default.svg").exists())) {
        console.log("[LOG] default.svg for default profile not found! Creating...");
        
        try {
            await mkdir("./profile_img");
        } catch (e) {
            console.log("[WARNING]:", e)
        }

        await Bun.write("profile_img/default.svg", default_svg_profile_img);
        console.log("[LOG] default.svg has been created!");
    }

    // Create Certificate for SSL/TLS
    if (!(await Bun.file("cert/key.pem").exists()) || !(await Bun.file("cert/cert.pem").exists())) {
        const forge = (await import("node-forge")).default

        console.log("[LOG] Certificate not found! Creating self-signed certificate...");
        try {
            await mkdir("cert");
        } catch(e) {
            console.log("[WARNING]:", e)   
        }

        const pki = forge.pki;
        const keys = pki.rsa.generateKeyPair(4096);
        const cert = pki.createCertificate();

        cert.publicKey = keys.publicKey;
        cert.serialNumber = "01";

        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + 36500);

        const attrs = [
            { name: "commonName", value: "localhost" },
        ];

        cert.setSubject(attrs);
        cert.setIssuer(attrs);

        cert.setExtensions([
            {
                name: "basicConstraints",
                cA: true,
            },
            {
                name: "keyUsage",
                digitalSignature: true,
                keyEncipherment: true,
                dataEncipherment: true,
            },
            {
                name: "subjectAltName",
                altNames: [
                    {
                        type: 2, // DNS
                        value: "localhost",
                    },
                ],
            },
        ]);

        cert.sign(keys.privateKey, forge.md.sha256.create());

        await Bun.write("cert/key.pem", pki.privateKeyToPem(keys.privateKey));
        await Bun.write("cert/cert.pem", pki.certificateToPem(cert));

        console.log("[LOG] Certificate SSL/TLS has been created!");
    }

    let version: any = null;
    try {
        version = Number((await global.database.selectFrom("kasirku").select("v").where("k", "=", "version").executeTakeFirst())?.v ?? 0);
    } catch(e) {
        await global.database.schema
        .createTable("kasirku")
        .ifNotExists()
        .addColumn("k", "text")
        .addColumn("v", "text")
        .execute();

        version = 0;
    }
    database_create_req(global.database, version, Date.now());

    if (version === 0) {
        await insert_ignore(global.database.insertInto("kasirku")
        .values({ k: "version", v: "1" }))
        .execute();
    } else {
        await global.database
        .updateTable("kasirku")
        .set({ v: "1" })
        .where("k", "=", "version")
        .execute();
    }

    console.log("[LOG] All ready!");
}

await prepare();
main();