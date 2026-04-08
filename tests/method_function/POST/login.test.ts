import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import login from "../../../src/method_function/POST/login";
import { global } from "../../../src/global";

type LoginRow = {
    id: number;
    password_hash: string;
    role_id: number;
};

type QueryCalls = {
    selectedTable: string | null;
    selectedColumns: string[];
    whereArgs: [string, string, string] | null;
};

function makeRequest(params: Record<string, string>) {
    return new Request("http://localhost/login", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
    });
}

function createDbMock(row: LoginRow | undefined, calls: QueryCalls) {
    const chain = {
        select(columns: string[]) {
            calls.selectedColumns = columns;
            return chain;
        },
        where(column: string, op: string, value: string) {
            calls.whereArgs = [column, op, value];
            return chain;
        },
        async executeTakeFirst() {
            return row;
        },
    };

    return {
        selectFrom(table: string) {
            calls.selectedTable = table;
            return chain;
        },
    };
}

const originalDatabase = global.database;
const originalUserSessions = global.user_sessions;
const originalPhText = global.ph_text;
const originalVerifySync = Bun.password.verifySync;

describe("POST login handler", () => {
    beforeEach(() => {
        global.ph_text = "$argon2id$v=19$m=1024,t=2,p=";
    });

    afterEach(() => {
        global.database = originalDatabase;
        global.user_sessions = originalUserSessions;
        global.ph_text = originalPhText;
        (Bun.password as any).verifySync = originalVerifySync;
    });

    it("returns 400 when username is missing", async () => {
        const req = makeRequest({ password: "secret" });
        const res = await login(req, "unused-token");

        expect(res.status).toBe(400);
        expect(await res.text()).toBe("Bad Request");
    });

    it("returns 400 when password is missing", async () => {
        const req = makeRequest({ username: "admin" });
        const res = await login(req, "unused-token");

        expect(res.status).toBe(400);
        expect(await res.text()).toBe("Bad Request");
    });

    it("returns 500 when database is unavailable", async () => {
        global.database = null as any;

        const req = makeRequest({ username: "admin", password: "admin" });
        const res = await login(req, "unused-token");

        expect(res.status).toBe(500);
        expect(await res.text()).toBe("Internal Server Error");
    });

    it("returns 403 when user is not found", async () => {
        const calls: QueryCalls = {
            selectedTable: null,
            selectedColumns: [],
            whereArgs: null,
        };
        global.database = createDbMock(undefined, calls) as any;

        const req = makeRequest({ username: "ghost", password: "secret" });
        const res = await login(req, "unused-token");

        expect(calls.selectedTable).toBe("users");
        expect(calls.whereArgs).toEqual(["username", "=", "ghost"]);
        expect(res.status).toBe(403);
        expect(await res.text()).toBe("Forbidden");
    });

    it("returns 403 when password verification fails", async () => {
        const calls: QueryCalls = {
            selectedTable: null,
            selectedColumns: [],
            whereArgs: null,
        };
        const row: LoginRow = { id: 10, password_hash: "HASH_TAIL", role_id: 1 };
        global.database = createDbMock(row, calls) as any;

        const verifyCalls: Array<[string, string]> = [];
        (Bun.password as any).verifySync = (plain: string, hash: string) => {
            verifyCalls.push([plain, hash]);
            return false;
        };

        const req = makeRequest({ username: "admin", password: "wrongpass" });
        const res = await login(req, "unused-token");

        expect(verifyCalls).toEqual([["wrongpass", `${global.ph_text}${row.password_hash}`]]);
        expect(res.status).toBe(403);
        expect(await res.text()).toBe("Forbidden");
    });

    it("returns 500 when session creation fails", async () => {
        const calls: QueryCalls = {
            selectedTable: null,
            selectedColumns: [],
            whereArgs: null,
        };
        const row: LoginRow = { id: 7, password_hash: "HASH_TAIL", role_id: 2 };
        global.database = createDbMock(row, calls) as any;

        (Bun.password as any).verifySync = () => true;

        global.user_sessions = {
            add() {
                return null;
            },
        } as any;

        const req = makeRequest({ username: "cashier", password: "correct" });
        const res = await login(req, "unused-token");

        expect(res.status).toBe(500);
        expect(await res.text()).toBe("Internal Server Error");
    });

    it("returns 200 and set-cookie when login succeeds", async () => {
        const calls: QueryCalls = {
            selectedTable: null,
            selectedColumns: [],
            whereArgs: null,
        };
        const row: LoginRow = { id: 1, password_hash: "ko", role_id: 1 };
        global.database = createDbMock(row, calls) as any;

        const verifyCalls: Array<[string, string]> = [];
        (Bun.password as any).verifySync = (plain: string, hash: string) => {
            verifyCalls.push([plain, hash]);
            return true;
        };

        const addCalls: Array<[number, number]> = [];
        global.user_sessions = {
            add(id: number, roleId: number) {
                addCalls.push([id, roleId]);
                return "session-123";
            },
        } as any;

        const req = makeRequest({ username: "admin", password: "admin" });
        const res = await login(req, "unused-token");
        const cookie = res.headers.get("set-cookie") || "";

        expect(calls.selectedTable).toBe("users");
        expect(calls.selectedColumns).toEqual(["id", "password_hash", "role_id"]);
        expect(calls.whereArgs).toEqual(["username", "=", "admin"]);
        expect(verifyCalls).toEqual([["admin", `${global.ph_text}${row.password_hash}`]]);
        expect(addCalls).toEqual([[1, 1]]);
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("session-123");
        expect(cookie).toContain("token=session-123");
        expect(cookie).toContain("Path=/");
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("SameSite=Strict");
        expect(cookie).toContain("Secure");
    });
});