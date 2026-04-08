import { test, expect, mock } from "bun:test";
import handler from "../../../src/method_function/POST/pengeluaran";
import { global } from "../../../src/global";

function makeRequest(data: Record<string, string>) {
    const body = new URLSearchParams(data).toString();

    return new Request("http://localhost", {
        method: "POST",
        body
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

        }
    } as any;
}

test("401 unauthorized", async () => {

    global.user_sessions = new Map();

    const req = makeRequest({
        deskripsi: "beli plastik",
        nominal: "10000"
    });

    const res = await handler(req, "");

    expect(res.status).toBe(401);
});

test("403 permission denied", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    mockRole(0);

    const req = makeRequest({
        deskripsi: "beli plastik",
        nominal: "10000"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(403);
});

test("400 bad request", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    mockRole(global.permissions.ADMINISTRATOR);

    const req = makeRequest({
        deskripsi: "",
        nominal: "0"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(400);
});

test("500 database error", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    mockRole(global.permissions.ADMINISTRATOR);

    global.sql_dialect = {
        insert_return_id: async () => {
            throw new Error("DB ERROR");
        }
    };

    const req = makeRequest({
        deskripsi: "beli plastik",
        nominal: "10000"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(500);
});

test("200 success", async () => {

    global.user_sessions = new Map([
        ["token123", { role_id: 1 }]
    ]);

    mockRole(global.permissions.ADMINISTRATOR);

    global.sql_dialect = {
        insert_return_id: async () => 77
    };

    global.sse_clients = {
        broadcast: mock(() => {})
    };

    const req = makeRequest({
        deskripsi: "beli plastik",
        nominal: "10000"
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(200);
});