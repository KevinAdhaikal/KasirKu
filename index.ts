import forge from "node-forge";
import { main } from "./src/server";
import { global } from "./src/global";
import { get_password_hash_only } from "./src/utils/utils";
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { minify as minifyHTML } from "html-minifier-terser"
import { minify as minifyJS } from "terser"
import CleanCSS from "clean-css"
import { brotliCompressSync } from "node:zlib";
import { database_manager } from "./src/database_manager/database_manager";

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

async function process_file(full_path: string) {
    const stat_file = await stat(full_path)
    let need_compile = false

    const build_path = full_path.replace("html/", "html_build/")

    try {
        const stat_build = await stat(build_path)
        if (stat_file.mtime > stat_build.mtime) need_compile = true
    } catch {
        need_compile = true
    }

    if (!need_compile) return

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
            tasks.push(scan_html_file(full_path))
            continue
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

function database_create_req(db: database_manager, version: number, current_ms: number) { // database create requirement
    if (version < 1) { // Database Version 1.0
        // roles
        db.run(
            "CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT UNIQUE, permission_level INTEGER, created_ms INTEGER, modified_ms INTEGER)"
        );
        db.run(
            "INSERT OR IGNORE INTO roles (name, permission_level, created_ms, modified_ms) VALUES (?, ?, ?, ?)", [
                "Administrator",
                global.permissions.ADMINISTRATOR,
                Date.now(),
                Date.now()
            ]
        );

        // users
        db.run(
            "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, full_name TEXT, password_hash TEXT, profile_img TEXT DEFAULT null, role_id INTEGER, created_ms INTEGER, modified_ms INTEGER, FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE)",
        );
        db.run(
            "INSERT OR IGNORE INTO users (username, full_name, password_hash, role_id, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?)",
            [
                "admin",
                "Administrator",
                get_password_hash_only(
                    Bun.password.hashSync("admin", {
                        algorithm: "argon2id",
                        timeCost: global.ph_timecost,
                        memoryCost: global.ph_memorycost,
                    }),
                ),
                1,
                current_ms,
                current_ms
            ],
        );

        // kategori barang
        db.run(
            `CREATE TABLE IF NOT EXISTS kategori_barang (
                id INTEGER PRIMARY KEY,
                nama_kategori TEXT UNIQUE,
                created_ms INTEGER,
                modified_ms INTEGER
            )`
        );
        db.run(
            "INSERT OR IGNORE INTO kategori_barang (nama_kategori, created_ms, modified_ms) VALUES (?, ?, ?)",
            [
                "Tidak Ada",
                Date.now(),
                Date.now()
            ]
        );

        // barang
        db.run(
            `CREATE TABLE IF NOT EXISTS barang (
                id INTEGER PRIMARY KEY,
                nama_barang TEXT,
                stok_barang INTEGER,
                kategori_barang_id INTEGER,
                harga_modal INTEGER,
                harga_jual INTEGER,
                barcode_barang TEXT UNIQUE DEFAULT NULL,
                created_ms INTEGER,
                modified_ms INTEGER,
                FOREIGN KEY (kategori_barang_id) REFERENCES kategori_barang(id) ON DELETE CASCADE ON UPDATE CASCADE
            )`
        );

        // barang masuk
        db.run(
            `CREATE TABLE IF NOT EXISTS barang_masuk (
                id INTEGER PRIMARY KEY,
                barang_id INTEGER,
                deskripsi TEXT,
                jumlah_barang INTEGER,
                tanggal_key INTEGER,
                created_ms INTEGER,
                modified_ms INTEGER,
                FOREIGN KEY (barang_id) REFERENCES barang(id) ON DELETE CASCADE ON UPDATE CASCADE
            )`
        );

        // penjualan
        db.run(
            `CREATE TABLE IF NOT EXISTS penjualan (
                id INTEGER PRIMARY KEY,
                total_barang INT,
                total_harga_modal INTEGER,
                total_harga_jual INTEGER,
                tanggal_key INTEGER,
                created_ms INTEGER, -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
                modified_ms INTEGER -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
            )`
        );

        // penjualan_item
        db.run(
            `CREATE TABLE IF NOT EXISTS penjualan_item (
                id INTEGER PRIMARY KEY,
                penjualan_id INTEGER NOT NULL,
                barang_id INTEGER NOT NULL,
                nama_barang TEXT,
                jumlah INTEGER,
                harga_modal INTEGER,
                harga_jual INTEGER,
                tanggal_key INTEGER,
                created_ms INTEGER, -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
                modified_ms INTEGER, -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
                FOREIGN KEY (penjualan_id) REFERENCES penjualan(id)
            )`
        );

        // pembukuan
        db.run(
            `CREATE TABLE IF NOT EXISTS pembukuan (
                id INTEGER PRIMARY KEY,
                tipe INTEGER CHECK(tipe IN (0,1)), -- 0 = pembukuan, 1 = pengeluaran
                deskripsi TEXT DEFAULT NULL,
                jumlah_uang INTEGER,
                referensi_id INTEGER,
                tanggal_key INTEGER,
                created_ms INTEGER, -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
                modified_ms INTEGER -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
            )`
        );
    }
}

async function prepare() {
    console.log("[LOG] Preparing Server...");

    if (!(await Bun.file("config.json").exists())) {
        console.log("[LOG] Config file not found! Creating...");

        await Bun.file("config.json").write(JSON.stringify(global.config, null, 4));
        console.log("[LOG] Config file has been created");
    } else global.config = await Bun.file("config.json").json();

    if (global.config.compile_html) {
       try {
            mkdirSync("html_build");
        } catch(e) {}

        await scan_html_file("html");
    }

    switch(global.config.db_type) {
        case "sqlite": {
            if (!(await Bun.file(`database/${global.config.db_name}.db`).exists())) {
                console.log("[LOG] Database not found! Creating...");
                try {
                    mkdirSync("database");
                } catch(e) {
                    console.log("[WARNING]:", e)
                }

                // kasirku property
                global.database.run(
                    "CREATE TABLE IF NOT EXISTS kasirku (key TEXT, value TEXT)"
                );
                global.database.run(
                    "INSERT INTO kasirku (key, value) VALUES ('version', '1')"
                )

                database_create_req(global.database, 0, Date.now());

                console.log("[LOG] Database has been created!");
            }
            else {
                global.database = new database_manager({
                    type: "sqlite",
                    filename: "database/" + global.config.db_name + ".db",
                });
                global.database.run("PRAGMA journal_mode = WAL;");
                global.database.run("PRAGMA synchronous = NORMAL;");
                global.database.run("PRAGMA foreign_keys = ON;");
            }
            
            break;
        }
        case "mysql": {
            global.database = new database_manager({
                type: "mysql",
                host: global.config.mysql.ip,
                port: global.config.mysql.port,
                user: global.config.mysql.username,
                password: global.config.mysql.password,
                database: global.config.db_name
            });
            break;
        }
        case "postgresql": {
            global.database = new database_manager({
                type: "postgresql",
                host: global.config.postgresql.ip,
                port: global.config.postgresql.port,
                user: global.config.postgresql.username,
                password: global.config.postgresql.password,
                database: global.config.db_name
            });

            const res = await global.database.get("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'kasirku' AND table_name = 'kasirku');");
            console.log(res);
            break;
        }
        default: {
            console.log("[ERROR] Unknown database type:", global.config.db_type);
            process.exit(0);
        }
    }

    console.log("[LOG] Done checking!");
    process.exit(0);
    // Preapre Profile Image Folder
    if (!(await Bun.file("profile_img/default.svg").exists())) {
        console.log("[LOG] default.svg for default profile not found! Creating...");
        
        try {
            mkdirSync("./profile_img");
        } catch (e) {
            console.log("[WARNING]:", e)
        }

        await Bun.write("profile_img/default.svg", default_svg_profile_img);
        console.log("[LOG] default.svg has been created!");
    }

    // Create Certificate for SSL/TLS
    if (!(await Bun.file("cert/key.pem").exists()) || !(await Bun.file("cert/cert.pem").exists())) {
        console.log("[LOG] Certificate not found! Creating self-signed certificate...");
        try {
            mkdirSync("cert");
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
                        value: "kevin.adhaikal",
                    },
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
    
    if (global.config.db_type === "sqlite") {
        global.database.run("PRAGMA journal_mode = WAL;");
        global.database.run("PRAGMA synchronous = NORMAL;");
        global.database.run("PRAGMA foreign_keys = ON;");
    }

    let version = null;
    try {
        version = Number(global.database.get("SELECT value FROM kasirku WHERE key = ?", ["version"]));

    } catch(e) {
        global.database.run(
            "CREATE TABLE IF NOT EXISTS kasirku (key TEXT, value TEXT)"
        );
        version = 0;
    }
    database_create_req(global.database, version, Date.now());

    if (version == 0) global.database.run("INSERT INTO kasirku (key, value) VALUES (?, ?)", [
        "version", "1"
    ])
    else global.database.run("UPDATE kasirku SET value = ? WHERE key = ?", [
        "1", "version"
    ])

    console.log("[LOG] All ready!");
}

await prepare();
main();