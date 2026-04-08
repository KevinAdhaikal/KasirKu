import { test, expect, mock } from "bun:test";
import handler from "../../../src/method_function/POST/barang_masuk";
import { global } from "../../../src/global";

function makeRequest(data: Record<string,string>) {
    return new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams(data).toString()
    });
}

test("401 if token invalid", async () => {

    global.user_sessions = new Map();

    const req = makeRequest({});
    const res = await handler(req, "");

    expect(res.status).toBe(401);
});

test("403 if not admin", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    permission_level: 0
                })
            };
        }
    };

    const req = makeRequest({});
    const res = await handler(req, "token123");

    expect(res.status).toBe(403);
});

test("400 if input invalid", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    permission_level: global.permissions.ADMINISTRATOR
                })
            };
        }
    };

    const req = makeRequest({});
    const res = await handler(req, "token123");

    expect(res.status).toBe(400);
});

test("200 success tambah barang masuk", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    const trx = {
        updateTable() {
            return {
                set() { return this },
                where() { return this },
                execute: async () => {}
            };
        }
    };

    global.database = {
        selectFrom(table: string) {

            if (table === "roles") {
                return {
                    select() { return this },
                    where() { return this },
                    executeTakeFirst: async () => ({
                        permission_level: global.permissions.ADMINISTRATOR
                    })
                };
            }

            if (table === "barang") {
                return {
                    select() { return this },
                    where() { return this },
                    executeTakeFirst: async () => ({
                        id: 1,
                        nama_barang: "Indomie",
                        stok_barang: 10
                    })
                };
            }

        },

        transaction() {
            return {
                execute: async (fn: any) => {
                    return await fn(trx);
                }
            };
        }

    };

    global.sql_dialect = {
        insert_return_id: async () => 99
    };

    global.sse_clients = {
        broadcast: mock(() => {})
    };

    global.date = new Date();

    const req = makeRequest({
        barang_id: "1",
        deskripsi: "Restock",
        jumlah_barang: "5"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(200);
});