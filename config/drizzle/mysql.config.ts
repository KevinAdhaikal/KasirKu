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

import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/database/schema/mysql.ts",
    out: "./database/migrations/mysql",
    dialect: "mysql",

    dbCredentials: {
        url: "mysql://kevinadhaikal:ganteng@localhost:3306/kasirku",
    },
});