import forge from "node-forge";
import { main } from "./src/server";
import { global } from "./src/global";
import { get_password_hash_only } from "./src/utils/utils";
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

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

async function prepare() {
    console.log("[LOG] Preparing Server...");

    // Preapre Profile Image Folder
    if (!(await Bun.file("html/profile_img/default.svg").exists())) {
        console.log("[LOG] default.svg for default profile not found! Creating...");
        
        try {
            mkdirSync("./html/profile_img");
        } catch (e) {
            console.log("[WARNING]:", e)
        }

        await Bun.write("html/profile_img/default.svg", default_svg_profile_img);
        console.log("[LOG] default.svg has been created!");
    }

    // Prepare Database
    if (!(await Bun.file("database/kasirku.db").exists())) {
        console.log("[LOG] Database not found! Creating...");
        try {
            mkdirSync("database");
        } catch(e) {
            console.log("[WARNING]:", e)
        }
        
        const current_ms = Date.now();
        const db = new Database("database/kasirku.db");

        db.run("PRAGMA journal_mode = WAL;");
        db.run("PRAGMA synchronous = NORMAL;");
        db.run("PRAGMA foreign_keys = ON;");

        // roles
        db.run(
            "CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT UNIQUE, permission_level INTEGER, created_ms INTEGER, modified_ms INTEGER)"
        );
        db.run(
            "INSERT INTO roles (name, permission_level, created_ms, modified_ms) VALUES (?, ?, ?, ?)", [
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
            "INSERT INTO users (username, full_name, password_hash, role_id, created_ms, modified_ms) VALUES (?, ?, ?, ?, ?, ?)",
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
            "INSERT INTO kategori_barang (nama_kategori, created_ms, modified_ms) VALUES (?, ?, ?)",
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
                harga_modal BLOB,
                harga_jual BLOB,
                barcode_barang TEXT UNIQUE DEFAULT NULL,
                created_ms INTEGER,
                modified_ms INTEGER,
                FOREIGN KEY (kategori_barang_id) REFERENCES kategori_barang(id) ON DELETE CASCADE ON UPDATE CASCADE
            )`
        );

        // penjualan
        db.run(
            `CREATE TABLE IF NOT EXISTS penjualan (
                id INTEGER PRIMARY KEY,
                total_barang INT,
                total_harga BLOB, -- gw bikin BLOB karena BIGINT
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
                jumlah INTEGER,
                harga_barang BLOB, -- gw bikin BLOB karena BIGINT
                tanggal_key INTEGER,
                created_ms INTEGER, -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
                modified_ms INTEGER, -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
                FOREIGN KEY (penjualan_id) REFERENCES penjualan(id),
                FOREIGN KEY (barang_id) REFERENCES barang(id)
            )`
        );

        // pembukuan
        db.run(
            `CREATE TABLE IF NOT EXISTS pembukuan (
                id INTEGER PRIMARY KEY,
                tipe INTEGER CHECK(tipe IN (0,1)), -- 0 = pembukuan, 1 = pengeluaran
                deskripsi TEXT DEFAULT NULL,
                jumlah_uang BLOB, -- gw bikin BLOB karena BIGINT
                referensi_id INTEGER,
                tanggal_key INTEGER,
                created_ms INTEGER, -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
                modified_ms INTEGER -- gw bikin INTEGER karena gw udah pake Date.now() pas insert
            )`
        );
        
        db.close();

        console.log("[LOG] Database has been created!");
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
            { name: "commonName", value: "kevin.adhaikal" },
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

    global.database = new Database("database/kasirku.db");
    
    global.database.run("PRAGMA journal_mode = WAL;");
    global.database.run("PRAGMA synchronous = NORMAL;");
    global.database.run("PRAGMA foreign_keys = ON;");
    
    console.log("[LOG] All ready!");
}

await prepare();
main();
