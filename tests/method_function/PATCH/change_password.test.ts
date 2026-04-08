import { test, expect } from "bun:test";
import handler from "../../../src/method_function/PATCH/change_password";
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
        old_pass: "12345678",
        new_pass: "abcdefgh"
    }), "");

    expect(res.status).toBe(401);
});

test("400 bad request", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    const res = await handler(req({
        old_pass: "",
        new_pass: "short"
    }), "token");

    expect(res.status).toBe(400);
});

test("403 wrong old password", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    global.ph_text = "";
    
    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    password_hash: "fakehash"
                })
            };
        }
    };

    const original = Bun.password.verifySync;
    Bun.password.verifySync = () => false;

    const res = await handler(req({
        old_pass: "12345678",
        new_pass: "abcdefgh"
    }), "token");

    Bun.password.verifySync = original;

    expect(res.status).toBe(403);
});

test("200 success", async () => {

    global.user_sessions = new Map([
        ["token", { user_id: 1, role_id: 1 }]
    ]);

    global.ph_text = "";
    global.ph_timecost = 2;
    global.ph_memorycost = 19456;

    global.database = {
        selectFrom() {
            return {
                select() { return this },
                where() { return this },
                executeTakeFirst: async () => ({
                    password_hash: "fakehash"
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
        remove_by_user_id() {}
    };

    global.user_sessions = {
        get() { return { user_id: 1, role_id: 1 }; },
        revoke_all_by_userid() {},
        add() { return "newtoken"; }
    };

    const verifyOrig = Bun.password.verifySync;
    Bun.password.verifySync = () => true;

    const hashOrig = Bun.password.hashSync;
    Bun.password.hashSync = () => "$argon2id$fakehash";

    const res = await handler(req({
        old_pass: "12345678",
        new_pass: "abcdefgh"
    }), "token");

    Bun.password.verifySync = verifyOrig;
    Bun.password.hashSync = hashOrig;

    expect(res.status).toBe(200);
});