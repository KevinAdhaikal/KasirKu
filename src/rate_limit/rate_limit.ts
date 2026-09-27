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

type RateData = {
    count: number;
    windowStart: number;
    jailUntil: number;
};

export class rate_limit {
    private rate_limits: Map<string, RateData>;
    private max_reqs: number;
    private limit_ms: number;
    private jail_ms: number;
    private interval: NodeJS.Timeout;

    constructor(
        limit_req_sec = 30,
        max_reqs = 50,
        jail_ms_times = 2
    ) {
        this.rate_limits = new Map();
        this.max_reqs = max_reqs;
        this.limit_ms = limit_req_sec * 1000;
        this.jail_ms = (limit_req_sec * jail_ms_times) * 1000;

        this.interval = setInterval(() => {
            const now = Date.now();
            for (const [ip, data] of this.rate_limits) {
                if (data.jailUntil !== 0 && now > data.jailUntil || data.jailUntil === 0 && now - data.windowStart > this.limit_ms) {
                    this.rate_limits.delete(ip);
                }
            }
        }, this.limit_ms);
    }

    check(ip: string): boolean {
        const now = Date.now();
        let data = this.rate_limits.get(ip);

        if (!data) {
            this.rate_limits.set(ip, {
                count: 1,
                windowStart: now,
                jailUntil: 0
            });
            return true;
        }

        if (data.jailUntil > now) return false;
        
        if (data.jailUntil !== 0 && data.jailUntil <= now) {
            data.count = 1;
            data.windowStart = now;
            data.jailUntil = 0;
            return true;
        }

        if (now - data.windowStart > this.limit_ms) {
            data.count = 1;
            data.windowStart = now;
            return true;
        }

        data.count++;

        if (data.count > this.max_reqs) {
            data.jailUntil = now + this.jail_ms;
            return false;
        }

        return true;
    }

    destroy() {
        this.rate_limits.clear();
        clearInterval(this.interval);
    }
}
