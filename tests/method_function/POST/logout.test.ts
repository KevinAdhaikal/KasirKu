import { test, expect, mock } from "bun:test";
import handler from "../../../src/method_function/POST/logout"; // sesuaikan path
import { global } from "../../../src/global";

test("should return 400 if token missing", async () => {

    const req = new Request("http://localhost", { method: "POST" });

    const res = await handler(req, "");

    expect(res.status).toBe(400);
});

test("should logout user and clear session", async () => {

    const removeSession = mock(() => {});
    const removeSSE = mock(() => {});

    global.user_sessions = {
        remove: removeSession,
    } as any;

    global.sse_clients = {
        remove: removeSSE
    } as any;

    const req = new Request("http://localhost", { method: "POST" });

    const res = await handler(req, "token123");

    expect(res.status).toBe(302);

    expect(removeSession).toHaveBeenCalledWith("token123");
    expect(removeSSE).toHaveBeenCalledWith("token123");

    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
});