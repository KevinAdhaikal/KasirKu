/*
──────────────────────────────────────────────────────────────
                           KasirKu
        Simple & Efficient Point of Sale (PoS) System

            Author      : Kevin Adhaikal
            Copyright   : (C) 2026 Kevin Adhaikal
            License     : AplikasiKasir License

    Permission is granted to modify and distribute this
    software, but the author's name must not be removed
                     or altered.
──────────────────────────────────────────────────────────────
*/

import { user_session_interface } from "../user_session/user_session";

export class sse_server {
    private clients = new Map<
        string,
        Set<{ controller: ReadableStreamDefaultController }>
    >();

    private encoder = new TextEncoder();
    private ping = this.encoder.encode(":\n\n"); // ini buat ngirim ping nya
    private ok = this.encoder.encode("data:" + JSON.stringify({
        type: 1,
        code: "OK"
    }) + "\n\n"); // ini buat ngirim status OK nya
    private interval: NodeJS.Timeout;

    constructor(timeout_ms: number) {
        this.interval = setInterval(() => {
            for (const [id, set] of this.clients) {
                for (const client of [...set]) {
                    try {
                        client.controller.enqueue(this.ping);
                    } catch {
                        client.controller.close();
                        set.delete(client);
                    }
                }

                if (set.size === 0) this.clients.delete(id);
            }
        }, timeout_ms);
    }

    add(id: string, req: Request, user: user_session_interface): ReadableStream {
        let cleanup: (() => void) | undefined;

        return new ReadableStream({
            start: (controller) => {
                let set = this.clients.get(id);

                if (!set) {
                    set = new Set();
                    this.clients.set(id, set);
                }

                const client = { controller, user };
                set.add(client);

                cleanup = () => {
                    req.signal?.removeEventListener("abort", cleanup!);
                    const current = this.clients.get(id);
                    if (!current) return;
                    current.delete(client);
                    if (current.size === 0) this.clients.delete(id);
                };

                req.signal?.addEventListener("abort", cleanup);
                controller.enqueue(this.ok);
            },

            cancel: () => {
                cleanup?.();
            }
        });
    }

    remove(id: string) {
        const set = this.clients.get(id);
        if (!set) return;

        for (const client of set) {
            try {
                client.controller.close();
            } catch {}
        }

        this.clients.delete(id);
    }

    send(id: string, data: string) {
        const set = this.clients.get(id);
        if (!set) return;

        const payload = this.encoder.encode(`data: ${data}\n\n`);

        for (const client of [...set]) {
            try {
                client.controller.enqueue(payload);
            } catch {
                client.controller.close();
                set.delete(client);
            }
        }

        if (set.size === 0) this.clients.delete(id);
    }

    broadcast(data: string) {
        const payload = this.encoder.encode(`data: ${data}\n\n`);

        for (const [id, set] of this.clients) {
            for (const client of [...set]) {
                try {
                    client.controller.enqueue(payload);
                } catch {
                    client.controller.close();
                    set.delete(client);
                }
            }

            if (set.size === 0) this.clients.delete(id);
        }
    }

    destroy() {
        for (const [, set] of this.clients) {
            for (const client of set) {
                try {
                    client.controller.close();
                } catch {}
            }
        }

        this.clients.clear();
        clearInterval(this.interval);
    }
}