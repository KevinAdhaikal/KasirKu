/*
──────────────────────────────────────────────────────────────
                           KasirKu
        Simple & Efficient Point of Sale (PoS) System

            Author      : Kevin Adhaikal
            Copyright   : (C) 2026 Kevin Adhaikal
            License     : AplikasiKasir License

    Permission is granted to modify and distribute this
    software, but the author's name must not be removed
                     or altered.
──────────────────────────────────────────────────────────────
*/

const MAX_CONCURRENT = 4;

import { dirname } from "node:path";
import { global } from "./global";
import { readdir, mkdir } from "node:fs/promises";

let future_import = {
    minifyHTML: null as any,
    minifyJS: null as any,
    CleanCSS: null as any,
    brotliCompressSync: null as any
}

const reader = Bun.stdin.stream().getReader();

// user input
async function user_input(question: string) {
  process.stdout.write(question);

  const { value } = await reader.read();
  return new TextDecoder().decode(value).trim();
}

function print_config(config: any) {
    console.log("[LOG] ============================================");
    console.log(`[LOG] Listening Port ${config.use_tls ? "HTTPS" : "HTTP"}: ${config.listen_port}`);
    console.log(`[LOG] Use TLS: ${config.use_tls}`);
    console.log(`[LOG] Compile assets saat startup: ${config.compile_html}`);
    console.log(`[LOG] Database Type: ${config.db_type}`);
    console.log(`[LOG] Database Name: ${config.db_name}`);
    console.log(`[LOG] TLS Key Path: ${config.tls_key_path}`);
    console.log(`[LOG] TLS Cert Path: ${config.tls_cert_path}`);
    console.log("[LOG] ============================================");
}

function get_env_value(key: string): string | undefined {
    const value = Bun.env[key] ?? process.env[key];
    if (value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function get_env_int(key: string): number | undefined {
    const value = get_env_value(key);
    if (!value) return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function get_env_bool(key: string): boolean | undefined {
    const value = get_env_value(key)?.toLowerCase();
    if (!value) return undefined;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

function has_any_env_config() {
    const keys = [
        "APP_LISTEN_PORT",
        "APP_USE_TLS",
        "APP_COMPILE_HTML",
        "DB_TYPE",
        "DB_NAME",
        "POSTGRES_HOST",
        "POSTGRES_PORT",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "MYSQL_HOST",
        "MYSQL_PORT",
        "MYSQL_USER",
        "MYSQL_PASSWORD",
        "TLS_KEY_PATH",
        "TLS_CERT_PATH",
    ];

    for (const key of keys) {
        if (get_env_value(key) !== undefined) return true;
    }

    return false;
}

function apply_config_patch(config: any) {
    if (!config || typeof config !== "object") return;

    if (typeof config.listen_port === "number") global.config.listen_port = config.listen_port;
    if (typeof config.use_tls === "boolean") global.config.use_tls = config.use_tls;
    if (typeof config.compile_html === "boolean") global.config.compile_html = config.compile_html;
    if (typeof config.db_type === "string") global.config.db_type = config.db_type.toLowerCase();
    if (typeof config.db_name === "string") global.config.db_name = config.db_name;
    if (typeof config.tls_key_path === "string") global.config.tls_key_path = config.tls_key_path;
    if (typeof config.tls_cert_path === "string") global.config.tls_cert_path = config.tls_cert_path;

    if (config.postgresql && typeof config.postgresql === "object") {
        if (typeof config.postgresql.host === "string") global.config.postgresql.host = config.postgresql.host;
        if (typeof config.postgresql.port === "number") global.config.postgresql.port = config.postgresql.port;
        if (typeof config.postgresql.user === "string") global.config.postgresql.user = config.postgresql.user;
        if (typeof config.postgresql.password === "string") global.config.postgresql.password = config.postgresql.password;
    }

    if (config.mysql && typeof config.mysql === "object") {
        if (typeof config.mysql.host === "string") global.config.mysql.host = config.mysql.host;
        if (typeof config.mysql.port === "number") global.config.mysql.port = config.mysql.port;
        if (typeof config.mysql.user === "string") global.config.mysql.user = config.mysql.user;
        if (typeof config.mysql.password === "string") global.config.mysql.password = config.mysql.password;
    }
}

function apply_env_config() {
    const listen_port = get_env_int("APP_LISTEN_PORT");
    if (listen_port !== undefined) global.config.listen_port = listen_port;

    const use_tls = get_env_bool("APP_USE_TLS");
    if (use_tls !== undefined) global.config.use_tls = use_tls;

    const compile_html = get_env_bool("APP_COMPILE_HTML");
    if (compile_html !== undefined) global.config.compile_html = compile_html;

    const db_type = get_env_value("DB_TYPE");
                if (db_type) global.config.db_type = db_type.toLowerCase() as "sqlite" | "mysql" | "postgresql";

    const db_name = get_env_value("DB_NAME");
    if (db_name) global.config.db_name = db_name;

    const pg_host = get_env_value("POSTGRES_HOST");
    if (pg_host) global.config.postgresql.host = pg_host;

    const pg_port = get_env_int("POSTGRES_PORT");
    if (pg_port !== undefined) global.config.postgresql.port = pg_port;

    const pg_user = get_env_value("POSTGRES_USER");
    if (pg_user) global.config.postgresql.user = pg_user;

    const pg_password = get_env_value("POSTGRES_PASSWORD");
    if (pg_password) global.config.postgresql.password = pg_password;

    const mysql_host = get_env_value("MYSQL_HOST");
    if (mysql_host) global.config.mysql.host = mysql_host;

    const mysql_port = get_env_int("MYSQL_PORT");
    if (mysql_port !== undefined) global.config.mysql.port = mysql_port;

    const mysql_user = get_env_value("MYSQL_USER");
    if (mysql_user) global.config.mysql.user = mysql_user;

    const mysql_password = get_env_value("MYSQL_PASSWORD");
    if (mysql_password) global.config.mysql.password = mysql_password;

    const tls_key_path = get_env_value("TLS_KEY_PATH");
    if (tls_key_path) global.config.tls_key_path = tls_key_path;

    const tls_cert_path = get_env_value("TLS_CERT_PATH");
    if (tls_cert_path) global.config.tls_cert_path = tls_cert_path;
}

async function check_config() {
    const has_config_file = await Bun.file("config.json").exists();
    const has_env_config = has_any_env_config();

    if (has_config_file) {
        console.log("[LOG] Using config.json configuration");
        apply_config_patch(await Bun.file("config.json").json());
        print_config(global.config);
        return;
    } else if (has_env_config) {
        console.log("[LOG] config.json not found. Using environment configuration (.env)");
        apply_env_config();
        print_config(global.config);
        return;
    }

    console.log("[LOG] Config file not found!");

    while (true) {
        const answer = await user_input("[LOG] Gunakan konfigurasi default (y/n) ");
        
        if (answer.toLowerCase() === "n") {
            let use_tls = await user_input("[LOG] Gunakan TLS/HTTPS? (true/false) (Default: true): ");
            if (use_tls) global.config.use_tls = use_tls.toLowerCase() === "true";

            let port = await user_input(`[LOG] Masukkan port ${global.config.use_tls ? "HTTPS" : "HTTP"} (Default: ${global.config.use_tls ? 443 : 80}): `);
            if (port) global.config.listen_port = Number(port);

            let compile_html = await user_input("[LOG] Compile assets saat startup? (true/false) (Default: false): ");
            if (compile_html) global.config.compile_html = compile_html.toLowerCase() === "true";

            while (true) {
                let conn_success = false;

                let db_type = await user_input("[LOG] Pilih database (sqlite / mysql / postgresql): ");
                if (db_type) global.config.db_type = db_type.toLowerCase() as "sqlite" | "mysql" | "postgresql";
                if (!["sqlite", "mysql", "postgresql"].includes(db_type)) {
                    console.log(`[ERROR] Databse "${db_type}" tidak ada`)
                    continue;
                }

                let db_name = await user_input("[LOG] Nama database (Default: kasirku): ");
                if (db_name) global.config.db_name = db_name;

                if (global.config.db_type === "sqlite") conn_success = true;
                else if (global.config.db_type === "postgresql") {
                    console.log("[LOG] Konfigurasi PostgreSQL");

                    let pg_host = await user_input("[LOG] PostgreSQL host (Default: localhost): ");
                    if (pg_host) global.config.postgresql.host = pg_host;

                    let pg_port = await user_input("[LOG] PostgreSQL port (Default: 5432): ");
                    if (pg_port) global.config.postgresql.port = Number(pg_port);

                    let pg_user = await user_input("[LOG] PostgreSQL user (Default: postgres): ");
                    if (pg_user) global.config.postgresql.user = pg_user;

                    let pg_pass = await user_input("[LOG] PostgreSQL password: ");
                    if (pg_pass) global.config.postgresql.password = pg_pass;

                    while (true) {
                        console.log("[LOG] Testing Koneksi PostgreSQL...");

                        const { Client } = await import("pg");

                        try {
                            const conn = new Client({
                                host: global.config.postgresql.host,
                                port: global.config.postgresql.port,
                                user: global.config.postgresql.user,
                                password: global.config.postgresql.password,
                                database: "postgres"
                            });

                            await conn.connect();

                            console.log("[LOG] Koneksi PostgreSQL berhasil!");
                            await conn.end();
                            conn_success = true;

                            break;
                        } catch (err) {
                            console.log("[ERROR] Koneksi PostgreSQL gagal!");
                            console.error(err);

                            const try_again = await user_input("[LOG] Apakah anda ingin coba mengulang koneksi lagi? (y/n) (Default: y): ");
                            if (try_again[0] === 'n') break;
                        }
                    }
                }
                else if (global.config.db_type === "mysql") {
                    console.log("[LOG] Konfigurasi MySQL");

                    let mysql_host = await user_input("[LOG] MySQL host (Default: localhost): ");
                    if (mysql_host) global.config.mysql.host = mysql_host;

                    let mysql_port = await user_input("[LOG] MySQL port (Default: 3306): ");
                    if (mysql_port) global.config.mysql.port = Number(mysql_port);

                    let mysql_user = await user_input("[LOG] MySQL user (Default: root): ");
                    if (mysql_user) global.config.mysql.user = mysql_user;

                    let mysql_pass = await user_input("[LOG] MySQL password (Default: no password): ");
                    if (mysql_pass) global.config.mysql.password = mysql_pass;

                    while (true) {
                        console.log("[LOG] Testing Koneksi MySQL...");

                        const { createConnection } = await import("mysql2/promise");

                        try {
                            const conn = await createConnection({
                                host: global.config.mysql.host,
                                user: global.config.mysql.user,
                                password: global.config.mysql.password
                            });

                            console.log("[LOG] Koneksi MySQL berhasil!");
                            await conn.end();
                            conn_success = true;
                            
                            break;
                        } catch (err) {
                            console.log("[ERROR] Koneksi MySQL gagal!");
                            console.error(err);

                            const try_again = await user_input("[LOG] Apakah anda ingin coba mengulang koneksi lagi? (y/n) (Default: y): ");
                            if (try_again[0] === 'n') break;
                        }
                    }
                }

                if (conn_success) break;
            }
        }

        print_config(global.config);

        const confirm = await user_input("[LOG] Apakah konfigurasi ini sudah benar? (y/n) ");
        if (confirm.toLowerCase() === "y") break;
    }

    await Bun.write("config.json", JSON.stringify(global.config, null, 4));
    console.log("[LOG] Config file has been created");
}

async function process_file(full_path: string) {
    const srcFile = Bun.file(full_path)
    const stat_file = await srcFile.stat()

    const build_path = full_path.replace("html/", "html_build/")
    let need_compile = false

    try {
        const stat_build = await Bun.file(build_path).stat()
        if (stat_file.mtime > stat_build.mtime) need_compile = true
    } catch {
        need_compile = true
    }

    if (!need_compile) return

    console.log("[BUILD]", full_path)

    let res: any
    const ext = full_path.slice(full_path.lastIndexOf("."))

    if (ext === ".html") {
        const text = await srcFile.text()

        res = await future_import.minifyHTML(text, {
            collapseWhitespace: true,
            removeComments: true,
            removeOptionalTags: true,
            collapseBooleanAttributes: true,
            minifyCSS: true,
            minifyJS: true
        })
    }
    else if (ext === ".js" && !full_path.endsWith(".min.js")) {
        const text = await srcFile.text()
        const res_js = await future_import.minifyJS(text)
        res = res_js.code
    }
    else if (ext === ".css" && !full_path.endsWith(".min.css")) {
        const text = await srcFile.text()
        const res_css = new future_import.CleanCSS().minify(text)
        res = res_css.styles
    }
    else {
        res = await srcFile.arrayBuffer()
    }

    await Bun.write(build_path, future_import.brotliCompressSync(res))
}

async function scan_html_file(startDir: string) {
    const dirs = [startDir]
    const tasks = new Set<Promise<any>>()

    while (dirs.length) {
        const dir = dirs.pop()!
        const entries = await readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
            const full_path = dir + "/" + entry.name

            if (entry.isDirectory()) {
                dirs.push(full_path)
                continue
            }

            const task = process_file(full_path)

            tasks.add(task)
            task.finally(() => tasks.delete(task))

            if (tasks.size >= MAX_CONCURRENT) {
                await Promise.race(tasks)
            }
        }
    }

    await Promise.all(tasks)
}

async function prepare() {
    console.log("[LOG] Preparing Server...");
    
    await check_config();
    
    if (global.config.compile_html) {
       try {
            await mkdir("./html_build");
        } catch(e) {}

        future_import.minifyHTML = (await import("html-minifier-terser")).minify;
        future_import.minifyJS = (await import("terser")).minify;
        future_import.CleanCSS = (await import("clean-css")).default;
        future_import.brotliCompressSync = (await import("node:zlib")).brotliCompressSync;
        await scan_html_file("html");
    }

    // Preapre Profile Image Folder
    if (!(await Bun.file("profile_img/default.svg").exists())) {
        console.log("[LOG] default.svg for default profile not found! Creating...");
        
        try {
            await mkdir("./profile_img");
        } catch (e) {
            console.log("[WARNING]:", e)
        }

        await Bun.write("profile_img/default.svg", global.default_svg_profile_img);
        console.log("[LOG] default.svg has been created!");
    }

    if (global.config.use_tls) {
        // Create Certificate for SSL/TLS
        const tls_key_path = global.config.tls_key_path;
        const tls_cert_path = global.config.tls_cert_path;

        if (!(await Bun.file(tls_key_path).exists()) || !(await Bun.file(tls_cert_path).exists())) {
            const forge = (await import("node-forge")).default

            console.log("[LOG] Certificate not found! Creating self-signed certificate...");
            await mkdir(dirname(tls_key_path), { recursive: true });
            await mkdir(dirname(tls_cert_path), { recursive: true });

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

            await Bun.write(tls_key_path, pki.privateKeyToPem(keys.privateKey));
            await Bun.write(tls_cert_path, pki.certificateToPem(cert));

            console.log("[LOG] Certificate SSL/TLS has been created!");
        }
    }

    reader.cancel();
    process.exit(0);
}

prepare();