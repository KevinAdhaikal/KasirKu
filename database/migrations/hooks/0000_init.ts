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

import type { DatabaseType, MigrationDb, MigrationSchema } from "../../../src/database/migrate";

export default async function(db: MigrationDb, dbType: DatabaseType) {
    const schema = (await import(`../../../src/database/schema/${dbType}`)) as MigrationSchema;
    const now = Date.now();

    // buat setting loh ya
    await db.insert(schema.settings).values([
        {
            section: "store",
            key: "name",
            value: "",
            type: "string",
            created_ms: now,
            modified_ms: now
        },
        {
            section: "store",
            key: "desc",
            value: "",
            type: "string",
            created_ms: now,
            modified_ms: now
        },
        {
            section: "store",
            key: "address",
            value: "",
            type: "string",
            created_ms: now,
            modified_ms: now
        },
        {
            section: "store",
            key: "phone_num",
            value: "",
            type: "string",
            created_ms: now,
            modified_ms: now
        },
        {
            section: "store",
            key: "email",
            value: "",
            type: "string",
            created_ms: now,
            modified_ms: now
        },
        {
            section: "store",
            key: "struk",
            value: "",
            type: "string",
            created_ms: now,
            modified_ms: now
        }
    ]);
}
