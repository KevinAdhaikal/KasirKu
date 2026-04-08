import { test, expect } from "bun:test";
import handler from "../../../src/method_function/PATCH/role";
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
        new_role_name: "kasir",
        new_permission_level: "2"
    }), "");

    expect(res.status).toBe(401);
});

test("403 no permission", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 2 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1
    };

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
        id: "2",
        new_role_name: "kasir",
        new_permission_level: "2"
    }), "token");

    expect(res.status).toBe(403);
});

test("400 bad request", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1
    };

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({ permission_level: 1 })
            };
        }
    };

    const res = await handler(req({
        id: "0",
        new_role_name: "",
        new_permission_level: "abc"
    }), "token");

    expect(res.status).toBe(400);
});

test("200 success + broadcast", async () => {

    let call = 0;
    let admin_refresh = false;
    let role_refresh = false;

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    global.permissions = {
        ADMINISTRATOR: 1
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
                executeTakeFirst: async () => ({ permission_level: 2 })
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
            if (role === 1) admin_refresh = true;
            if (role === 2) role_refresh = true;
        }
    };

    const res = await handler(req({
        id: "2",
        new_role_name: "kasir",
        new_permission_level: "2"
    }), "token");

    expect(res.status).toBe(200);
    expect(admin_refresh).toBe(true);
    expect(role_refresh).toBe(true);
});