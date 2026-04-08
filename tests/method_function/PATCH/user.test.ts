import { test, expect } from "bun:test";
import handler from "../../../src/method_function/PATCH/user";
import { global } from "../../../src/global";

function makeReq(body: Record<string, any>) {
    return new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams(body).toString()
    });
}

test("401 unauthorized", async () => {

    global.user_sessions = new Map();

    const res = await handler(makeReq({
        id: "2",
        new_username: "test",
        new_full_name: "Test",
        new_role_id: "2"
    }), "");

    expect(res.status).toBe(401);
});

test("403 not admin", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 2 }]
    ]);

    global.permissions = { ADMINISTRATOR: 1 };

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({ permission_level: 0 })
            };
        }
    };

    const res = await handler(makeReq({
        id: "2",
        new_username: "test",
        new_full_name: "Test",
        new_role_id: "2"
    }), "token");

    expect(res.status).toBe(403);
});

test("403 edit own account", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 2, role_id: 1 }]
    ]);

    global.permissions = { ADMINISTRATOR: 1 };

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({ permission_level: 1 })
            };
        }
    };

    const res = await handler(makeReq({
        id: "2",
        new_username: "test",
        new_full_name: "Test",
        new_role_id: "2"
    }), "token");

    expect(res.status).toBe(403);
});

test("404 user not found", async () => {

    let call = 0;

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    global.permissions = { ADMINISTRATOR: 1 };

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

    const res = await handler(makeReq({
        id: "5",
        new_username: "test",
        new_full_name: "Test",
        new_role_id: "2"
    }), "token");

    expect(res.status).toBe(404);
});

test("200 success update", async () => {

    let call = 0;
    let refreshUsers = false;

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    (global.user_sessions as any).revoke_all_by_userid = () => {};
    (global.user_sessions as any).change_role = () => {};

    global.permissions = { ADMINISTRATOR: 1 };

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
                executeTakeFirst: async () => ({ role_id: 2 })
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
        send_to_role(role: number) {
            if (role === 1) refreshUsers = true;
        },
        send_to_user() {},
        remove_by_user_id() {}
    };

    const res = await handler(makeReq({
        id: "2",
        new_username: "test",
        new_full_name: "Test",
        new_role_id: "3"
    }), "token");

    expect(res.status).toBe(200);
    expect(refreshUsers).toBe(true);
});