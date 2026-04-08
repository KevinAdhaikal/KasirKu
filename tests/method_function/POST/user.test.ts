import { expect, test } from "bun:test";

import handler from "../../../src/method_function/POST/user";
import { global } from "../../../src/global";

test("create user success", async () => {

    global.user_sessions = {
        get: () => ({ role_id: 1 })
    } as any;

    global.database = {
        selectFrom: () => ({
            select: () => ({
                where: () => ({
                    executeTakeFirst: async () => ({
                        permission_level: global.permissions.ADMINISTRATOR
                    })
                })
            })
        }),
        insertInto: () => ({
            values: () => ({
                execute: async () => {}
            })
        })
    } as any;

    global.sse_clients = {
        send_to_role: () => {}
    } as any;

    const req = new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams({
            username: "kevin",
            full_name: "Kevin",
            password: "12345678",
            role_id: "1"
        })
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(200);
});