import { test, expect, mock } from "bun:test";
import handler from "../../../src/method_function/POST/kategori_barang";
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

test("403 if permission insufficient", async () => {

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

    const req = makeRequest({
        nama_kategori: "Makanan"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(403);
});

test("400 if nama_kategori empty", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    permission_level:
                        global.permissions.ADMINISTRATOR
                })
            };
        }
    };

    const req = makeRequest({});
    const res = await handler(req, "token123");

    expect(res.status).toBe(400);
});

test("403 if duplicate kategori", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    permission_level:
                        global.permissions.ADMINISTRATOR
                })
            };
        }
    };

    global.sql_dialect = {
        insert_return_id: async () => {
            throw { code: "ER_DUP_ENTRY", errno: 1062 };
        }
    };

    const req = makeRequest({
        nama_kategori: "Makanan"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(403);
});

test("200 success create kategori", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    permission_level:
                        global.permissions.ADMINISTRATOR
                })
            };
        }
    };

    global.sql_dialect = {
        insert_return_id: async () => 5
    };

    global.sse_clients = {
        broadcast: mock(() => {})
    };

    const req = makeRequest({
        nama_kategori: "Makanan"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json.id).toBe(5);
    expect(json.nama_kategori).toBe("Makanan");
});