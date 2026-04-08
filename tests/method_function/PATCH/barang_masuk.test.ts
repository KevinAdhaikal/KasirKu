import { test, expect, mock } from "bun:test";
import handler from "../../../src/method_function/PATCH/barang_masuk";
import { global } from "../../../src/global";

function createRequest(body: Record<string, any>) {
    return new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams(body).toString()
    });
}

test("Unauthorized jika token tidak ada", async () => {
    global.user_sessions = new Map();

    const req = createRequest({
        id: "1",
        tanggal_key: "123",
        deskripsi: "test",
        jumlah_barang: "5"
    });

    const res = await handler(req, "");

    expect(res.status).toBe(401);
});

test("Forbidden jika permission tidak cukup", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
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

    const req = createRequest({
        id: "1",
        tanggal_key: "123",
        deskripsi: "test",
        jumlah_barang: "5"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(403);
});

test("Bad Request jika input invalid", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
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

    const req = createRequest({
        id: "abc",
        tanggal_key: "123",
        deskripsi: "test",
        jumlah_barang: "5"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(400);
});

test("Not Found jika barang_masuk tidak ada", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
    };

    global.database = {
        selectFrom(table: string) {

            if (table === "roles") {
                return {
                    select() { return this },
                    where() { return this },
                    executeTakeFirst: async () => ({
                        permission_level: 1
                    })
                };
            }

            if (table === "barang_masuk") {
                return {
                    select() { return this },
                    where() { return this },
                    executeTakeFirst: async () => undefined
                };
            }
        }
    };

    const req = createRequest({
        id: "1",
        tanggal_key: "123",
        deskripsi: "test",
        jumlah_barang: "5"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(404);
});