import { test, expect, mock } from "bun:test";

import handler from "../../../src/method_function/POST/role";
import { global } from "../../../src/global";

test("401 if token invalid", async () => {

    global.user_sessions = {
        get: () => null
    } as any;

    const req = new Request("http://localhost", { method: "POST" });

    const res = await handler(req, "token123");

    expect(res.status).toBe(401);
});

test("403 if not administrator", async () => {

    global.user_sessions = {
        get: () => ({ role_id: 1 })
    } as any;

    global.permissions = {
        ADMINISTRATOR: 1
    } as any;

    global.database = {
        selectFrom: () => ({
            select: () => ({
                where: () => ({
                    executeTakeFirst: async () => ({
                        permission_level: 0
                    })
                })
            })
        })
    } as any;

    const req = new Request("http://localhost", { method: "POST" });

    const res = await handler(req, "token123");

    expect(res.status).toBe(403);
});

test("400 if bad request", async () => {

    global.user_sessions = {
        get: () => ({ role_id: 1 })
    } as any;

    global.permissions = {
        ADMINISTRATOR: 1
    } as any;

    global.database = {
        selectFrom: () => ({
            select: () => ({
                where: () => ({
                    executeTakeFirst: async () => ({
                        permission_level: 1
                    })
                })
            })
        })
    } as any;

    const req = new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams({})
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(400);
});

test("403 if duplicate role", async () => {

    global.user_sessions = {
        get: () => ({ role_id: 1 })
    } as any;

    global.permissions = {
        ADMINISTRATOR: 1
    } as any;

    global.database = {
        selectFrom: () => ({
            select: () => ({
                where: () => ({
                    executeTakeFirst: async () => ({
                        permission_level: 1
                    })
                })
            })
        }),
        insertInto: () => ({
            values: () => ({
                execute: async () => {
                    const err: any = new Error();
                    err.code = "ER_DUP_ENTRY";
                    throw err;
                }
            })
        })
    } as any;

    const req = new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams({
            role_name: "Kasir",
            permission_level: "2"
        })
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(403);
});

test("200 success add role", async () => {

    const sendMock = mock(() => {});

    global.user_sessions = {
        get: () => ({ role_id: 1 })
    } as any;

    global.permissions = {
        ADMINISTRATOR: 1
    } as any;

    global.database = {
        selectFrom: () => ({
            select: () => ({
                where: () => ({
                    executeTakeFirst: async () => ({
                        permission_level: 1
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
        send_to_role: sendMock
    } as any;

    const req = new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams({
            role_name: "Kasir",
            permission_level: "2"
        })
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
});