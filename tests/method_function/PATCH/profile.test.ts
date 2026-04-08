import { test, expect } from "bun:test";
import handler from "../../../src/method_function/PATCH/profile";
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
        new_username: "kevin",
        new_full_name: "Kevin"
    }), "");

    expect(res.status).toBe(401);
});

test("400 bad request username invalid", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1 }]
    ]);

    const res = await handler(req({
        new_username: "INVALID USER",
        new_full_name: "Kevin"
    }), "token");

    expect(res.status).toBe(400);
});

test("500 db not found", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1 }]
    ]);

    global.database = null;

    const res = await handler(req({
        new_username: "kevin",
        new_full_name: "Kevin"
    }), "token");

    expect(res.status).toBe(500);
});

test("500 user not found", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1 }]
    ]);

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => null
            };
        }
    };

    const res = await handler(req({
        new_username: "kevin",
        new_full_name: "Kevin"
    }), "token");

    expect(res.status).toBe(500);
});

test("403 duplicate username", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1 }]
    ]);

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({ username: "old" })
            };
        },
        updateTable() {
            return {
                set() { return this },
                where() { return this },
                execute: async () => {
                    const err: any = new Error();
                    err.code = "ER_DUP_ENTRY";
                    throw err;
                }
            };
        }
    };

    const res = await handler(req({
        new_username: "kevin",
        new_full_name: "Kevin"
    }), "token");

    expect(res.status).toBe(403);
});

test("200 success + broadcast", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1 }]
    ]);

    let send_user = false;
    let send_role = false;

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({ username: "old" })
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
        send_to_user() {
            send_user = true;
        },
        send_to_role() {
            send_role = true;
        }
    };

    const res = await handler(req({
        new_username: "kevin",
        new_full_name: "Kevin"
    }), "token");

    expect(res.status).toBe(200);
    expect(send_user).toBe(true);
    expect(send_role).toBe(true);
});