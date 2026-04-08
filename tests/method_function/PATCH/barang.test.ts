import { test, expect } from "bun:test";
import handler from "../../../src/method_function/PATCH/barang";
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
        nama_barang: "mie",
        stok_barang: "10",
        kategori_barang_id: "1",
        harga_modal: "1000",
        harga_jual: "2000"
    }), "");

    expect(res.status).toBe(401);
});

test("403 forbidden", async () => {

    global.user_sessions = new Map([
        ["token", { role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_BARANG: 2
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
        nama_barang: "mie",
        stok_barang: "10",
        kategori_barang_id: "1",
        harga_modal: "1000",
        harga_jual: "2000"
    }), "token");

    expect(res.status).toBe(403);
});

test("400 bad request", async () => {

    global.user_sessions = new Map([
        ["token", { role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_BARANG: 2
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
        nama_barang: "mie",
        stok_barang: "10",
        kategori_barang_id: "1",
        harga_modal: "1000",
        harga_jual: "2000"
    }), "token");

    expect(res.status).toBe(400);
});

test("200 success", async () => {

    global.user_sessions = new Map([
        ["token", { role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_BARANG: 2
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
                execute: async () => {}
            };
        }
    };

    global.sse_clients = {
        broadcast() {}
    };

    const res = await handler(req({
        id: "1",
        nama_barang: "mie",
        stok_barang: "10",
        kategori_barang_id: "1",
        harga_modal: "1000",
        harga_jual: "2000"
    }), "token");

    expect(res.status).toBe(200);
});