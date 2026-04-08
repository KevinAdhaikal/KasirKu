import { test, expect } from "bun:test";
import handler from "../../../src/method_function/PATCH/pengeluaran";
import { global } from "../../../src/global";

function req(body: Record<string, any>) {
    return new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams(body).toString()
    });
}

test("401 unauthorized", async () => {

    global.user_sessions = new Map();

    const res = await handler(req({
        id: "1",
        tanggal_key: "123",
        deskripsi: "test",
        nominal: "1000"
    }), "");

    expect(res.status).toBe(401);
});

test("403 forbidden", async () => {

    global.user_sessions = new Map([
        ["token", { role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
    };

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

    const res = await handler(req({
        id: "1",
        tanggal_key: "123",
        deskripsi: "test",
        nominal: "1000"
    }), "token");

    expect(res.status).toBe(403);
});

test("400 bad request", async () => {

    global.user_sessions = new Map([
        ["token", { role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
    };

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    permission_level: 1
                })
            };
        }
    };

    const res = await handler(req({
        id: "abc",
        tanggal_key: "0",
        deskripsi: "",
        nominal: "0"
    }), "token");

    expect(res.status).toBe(400);
});

test("500 db error", async () => {

    global.user_sessions = new Map([
        ["token", { role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
    };

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    permission_level: 1
                })
            };
        },
        updateTable() {
            return {
                set() { return this },
                where() { return this },
                executeTakeFirst: async () => {
                    throw new Error("db error");
                }
            };
        }
    };

    const res = await handler(req({
        id: "1",
        tanggal_key: "123",
        deskripsi: "test",
        nominal: "1000"
    }), "token");

    expect(res.status).toBe(500);
});

test("200 success + broadcast", async () => {

    global.user_sessions = new Map([
        ["token", { role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
    };

    let broadcast_called = false;

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    permission_level: 1
                })
            };
        },
        updateTable() {
            return {
                set() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    numUpdatedRows: 1n
                })
            };
        }
    };

    global.sse_clients = {
        broadcast() {
            broadcast_called = true;
        }
    };

    const res = await handler(req({
        id: "1",
        tanggal_key: "123",
        deskripsi: "test",
        nominal: "1000"
    }), "token");

    expect(res.status).toBe(200);
    expect(broadcast_called).toBe(true);
});