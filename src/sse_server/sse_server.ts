import { user_session_interface } from "../user_session/user_session";

export class sse_server {
    private clients = new Map<
        string,
        Set<{ controller: ReadableStreamDefaultController; user: user_session_interface }>
    >();

    private encoder = new TextEncoder();
    private ping = this.encoder.encode(":\n\n");
    private ok = this.encoder.encode("data:" + JSON.stringify({
        type: 1,
        code: "OK"
    }) + "\n\n");
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
        return new ReadableStream({
            start: (controller) => {
                let set = this.clients.get(id);

                if (!set) {
                    set = new Set();
                    this.clients.set(id, set);
                }

                const client = { controller, user };
                set.add(client);
                

                const cleanup = () => {
                    try {
                        controller.close();
                    } catch {}

                    set!.delete(client);

                    if (set!.size === 0) this.clients.delete(id);
                };

                req.signal?.addEventListener("abort", cleanup);
                controller.enqueue(this.ok);
            },

            cancel: () => {
                const set = this.clients.get(id);
                if (!set) return;

                for (const client of [...set]) {
                    try {
                        client.controller.close();
                    } catch {}
                    set.delete(client);
                }

                if (set.size === 0) this.clients.delete(id);
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

    remove_by_user_id(user_id: number) {
        for (const [id, set] of this.clients) {
            for (const client of [...set]) {
                if (client.user.user_id !== user_id) continue;
                try {
                    client.controller.close();
                } catch {}

                set.delete(client);
            }

            if (set.size === 0) this.clients.delete(id);
        }
    }

    remove_by_role_id(role_id: number) {
        for (const [id, set] of this.clients) {
            for (const client of [...set]) {
                if (client.user.role_id !== role_id) continue;
                
                try {
                    client.controller.close();
                } catch {}

                set.delete(client);
            }

            if (set.size === 0) this.clients.delete(id);
        }
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

    send_to_user(user_id: number, data: string) {
        const payload = this.encoder.encode(`data: ${data}\n\n`);

        for (const [id, set] of this.clients) {
            for (const client of [...set]) {
                if (client.user.user_id !== user_id) continue;

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

    send_to_role(role_id: number, data: string) {
        const payload = this.encoder.encode(`data: ${data}\n\n`);

        for (const [id, set] of this.clients) {
            for (const client of [...set]) {
                if (client.user.role_id !== role_id) continue;

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