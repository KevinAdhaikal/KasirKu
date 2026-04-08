import { test, expect, mock } from "bun:test";

import handler from "../../../src/method_function/POST/retur_barang";
import { global } from "../../../src/global";

test("401 if token invalid", async () => {

    global.user_sessions = {
        get: () => null
    } as any;

    const req = new Request("http://localhost", { method: "POST" });

    const res = await handler(req, "token123");

    expect(res.status).toBe(401);
});

test("403 if no permission", async () => {

    global.user_sessions = {
        get: () => ({ role_id: 1 })
    } as any;

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
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

test("400 if bad input", async () => {

    global.user_sessions = {
        get: () => ({ role_id: 1 })
    } as any;

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
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
        body: ""
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(400);
});

test("200 success retur barang", async () => {

    const broadcastMock = mock(() => {});

    global.user_sessions = {
        get: () => ({ role_id: 1 })
    } as any;

    global.permissions = {
        ADMINISTRATOR: 1,
        MANAGE_PEMBUKUAN: 2
    } as any;

    global.date = new Date();

    global.sql_dialect = {
        insert_return_id: async () => 10
    } as any;

    global.sse_clients = {
        broadcast: broadcastMock
    } as any;

    global.database = {
        selectFrom: () => ({
            select: () => ({
                where: () => ({
                    executeTakeFirst: async () => ({
                        permission_level: 1,
                        stok_barang: 5,
                        nama_barang: "Indomie"
                    })
                })
            })
        }),

        transaction: () => ({
            execute: async (fn: any) => fn({
                updateTable: () => ({
                    set: () => ({
                        where: () => ({
                            execute: async () => {}
                        })
                    })
                })
            })
        })
    } as any;

    const body = new URLSearchParams({
        barang_id: "1",
        deskripsi: "rusak",
        jumlah_barang: "2"
    });

    const req = new Request("http://localhost", {
        method: "POST",
        body
    });

    const res = await handler(req, "token123");

    expect(res.status).toBe(200);
    expect(broadcastMock).toHaveBeenCalledTimes(2);
});
