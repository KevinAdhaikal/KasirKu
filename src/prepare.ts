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

import { mkdir } from "node:fs/promises";

async function check_version() {
    
}

async function prepare() {
    console.log("[LOG] Preparing Server...");
    await mkdir("./profile_img", { recursive: true });

    process.exit(0);
}

prepare();