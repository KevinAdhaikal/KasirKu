import { test, expect, mock } from "bun:test";
import handler from "../../../src/method_function/POST/masuk_ke_pembukuan";
import { global } from "../../../src/global";

function makeRequest(data: any) {
    return new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

function mockRole(permission: number) {
    global.database = {
        selectFrom(table: string) {

            if (table === "roles") {
                return {
                    select() { return this },
                    where() { return this },
                    executeTakeFirst: async () => ({
                        permission_level: permission
                    })
                };
            }

            if (table === "barang") {
                return {
                    select() { return this },
                    where() { return this },
                    executeTakeFirst: async () => ({
                        nama_barang: "Indomie",
                        stok_barang: 10,
                        harga_modal: 2000,
                        harga_jual: 3000
                    })
                };
            }

        }
    } as any;
}

test("401 unauthorized", async () => {

    global.user_sessions = new Map();

    const req = makeRequest({});
    const res = await handler(req, "");

    expect(res.status).toBe(401);
});

test("403 permission denied", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    mockRole(0);

    const req = makeRequest({
        items: []
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(403);
});

test("400 items not array", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    mockRole(global.permissions.ADMINISTRATOR);

    const req = makeRequest({
        items: {}
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(400);
});

test("404 barang tidak ditemukan", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

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
                    executeTakeFirst: async () => null
                };
            }

        }
    } as any;

    const req = makeRequest({
        items: [{ id: 1, jumlah_barang: 2 }]
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(404);
});

test("200 transaksi sukses", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    mockRole(global.permissions.ADMINISTRATOR);

    global.sql_dialect = {
        insert_return_id: async () => 99
    };

    global.sse_clients = {
        broadcast: mock(() => {})
    };

    global.database.transaction = () => ({
        execute: async (fn: any) => {
            const trx = {
                insertInto() {
                    return {
                        values() { return this },
                        execute: async () => {}
                    };
                },
                updateTable() {
                    return {
                        set() { return this },
                        where() { return this },
                        execute: async () => {}
                    };
                }
            };

            await fn(trx);
        }
    });

    const req = makeRequest({
        items: [{
            id: 1,
            jumlah_barang: 2
        }]
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(200);
});