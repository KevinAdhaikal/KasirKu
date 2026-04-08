import { test, expect } from "bun:test";
import handler from "../../../src/method_function/PATCH/retur_barang";
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
        tanggal_key: "20240101",
        deskripsi: "test",
        jumlah_barang: "2"
    }), "");

    expect(res.status).toBe(401);
});

test("400 bad request", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    const res = await handler(req({
        id: "abc",
        tanggal_key: "0",
        deskripsi: "",
        jumlah_barang: "0"
    }), "token");

    expect(res.status).toBe(400);
});

test("403 permission denied", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({ permission_level: 0 })
            };
        }
    };

    const res = await handler(req({
        id: "1",
        tanggal_key: "20240101",
        deskripsi: "test",
        jumlah_barang: "2"
    }), "token");

    expect(res.status).toBe(403);
});

test("404 retur not found", async () => {

    let call = 0;

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
    };

    global.database = {
        selectFrom() {
            call++;
            if (call === 1) {
                return {
                    select() { return this },
                    where() { return this },
                    executeTakeFirst: async () => ({ permission_level: 1 })
                };
            }

            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => null
            };
        }
    };

    const res = await handler(req({
        id: "1",
        tanggal_key: "20240101",
        deskripsi: "test",
        jumlah_barang: "2"
    }), "token");

    expect(res.status).toBe(404);
});

test("200 success + broadcast", async () => {

    let call = 0;
    let broadcast_count = 0;

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
    };

    global.database = {
        selectFrom() {
            call++;

            if (call === 1) {
                return {
                    select() { return this },
                    where() { return this },
                    executeTakeFirst: async () => ({ permission_level: 1 })
                };
            }

            if (call === 2) {
                return {
                    select() { return this },
                    where() { return this },
                    executeTakeFirst: async () => ({
                        jumlah_barang: 5,
                        barang_id: 10
                    })
                };
            }

            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({ stok_barang: 50 })
            };
        },

        transaction() {
            return {
                execute: async (fn: any) => {
                    const trx = {
                        updateTable() {
                            return {
                                set() { return this },
                                where() { return this },
                                execute: async () => {}
                            };
                        },
                        selectFrom() {
                            return {
                                select() { return this },
                                where() { return this },
                                executeTakeFirst: async () => ({ stok_barang: 50 })
                            };
                        }
                    };

                    return fn(trx);
                }
            };
        }
    };

    global.sse_clients = {
        broadcast() {
            broadcast_count++;
        }
    };

    const res = await handler(req({
        id: "1",
        tanggal_key: "20240101",
        deskripsi: "update",
        jumlah_barang: "3"
    }), "token");

    expect(res.status).toBe(200);
    expect(broadcast_count).toBe(2);
});