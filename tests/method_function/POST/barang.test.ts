import { test, expect, mock } from "bun:test";
import handler from "../../../src/method_function/POST/barang";
import { global } from "../../../src/global";

function makeRequest(data: Record<string,string>) {
    return new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams(data).toString()
    });
}

test("Unauthorized if token invalid", async () => {
    global.user_sessions = new Map();

    const req = makeRequest({});
    const res = await handler(req, "");

    expect(res.status).toBe(401);
});

test("Forbidden if permission not enough", async () => {

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
            }
        }
    };

    const req = makeRequest({});
    const res = await handler(req, "token123");

    expect(res.status).toBe(403);
});

test("Bad request if input invalid", async () => {

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
            }
        }
    };

    const req = makeRequest({});
    const res = await handler(req, "token123");

    expect(res.status).toBe(400);
});

test("Success insert barang", async () => {

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
            }
        }
    };

    global.sql_dialect = {
        insert_return_id: async () => 99
    };

    global.sse_clients = {
        broadcast: mock(() => {})
    };

    const req = makeRequest({
        nama_barang: "Indomie",
        stok_barang: "10",
        kategori_barang_id: "1",
        harga_modal: "2000",
        harga_jual: "3000"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(200);
});