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

import { generate_hex } from "../utils/utils";
import { global } from "../global";
import { eq } from "drizzle-orm";

/*
export interface user_session_interface {
    user_id: number,
    role_id: number,
    is_active: Boolean
}*/

export interface user_session_interface {
    user_id: number,
    role_id: number
}

export class user_session {
    // private timer_id: NodeJS.Timeout;
    private id_length: number = 0;
    private expired_ms: number = 0;
    private db;
    private schema;
    // private session_ids: Map<string, user_session_interface> = new Map();

    constructor(id_length: number = 32, expired_ms = 24 * 60 * 60 * 1000) {
        this.id_length = id_length % 2 === 0 ? id_length : id_length + 1;
        this.expired_ms = expired_ms;
        this.db = global.database;
        this.schema = global.schema;
    }

    async add(user_id: number, role_id: number): Promise<string | false> {
        for (let a = 0; a < 100; a++) { // 100x tries
            const token = generate_hex(this.id_length);
            const [row] = await this.db
                .select({
                    id: this.schema.user_sessions.id
                })
                .from(this.schema.user_sessions)
                .where(eq(this.schema.user_sessions.token, token))
            .limit(1);

            if (!row) {
                const now = Date.now();
                await this.db
                    .insert(this.schema.user_sessions)
                    .values({
                        user_id,
                        role_id,
                        token,
                        created_ms: now,
                        expired_ms: now + this.expired_ms,
                        is_active: 1
                    });

                return token;
            }
        }
        
        return false; // try again
    }

    async get(token: string): Promise<user_session_interface | false> {
        const [row] = await this.db
            .select({
                user_id: this.schema.user_sessions.user_id,
                role_id: this.schema.user_sessions.role_id,
                is_active: this.schema.user_sessions.is_active,
                expired_ms: this.schema.user_sessions.expired_ms
            })
            .from(this.schema.user_sessions)
            .where(eq(this.schema.user_sessions.token, token))
        .limit(1);

        if (!row) return false;

        const now = Date.now();

        if (now >= row.expired_ms) {
            if (!row.is_active) {
                await this.remove(token);
                global.sse_clients.remove(token);
                return false;
            } else {
                if (now >= row.expired_ms + this.expired_ms) {
                    await this.remove(token);
                    global.sse_clients.remove(token);
                    return false;
                }
                await this.db
                    .update(this.schema.user_sessions)
                    .set({
                        is_active: 1,
                        expired_ms: now + this.expired_ms
                    })
                .where(eq(this.schema.user_sessions.token, token));
            }
        }
        return row ?? false;
    }

    async get_ids_by_userid(userid: number): Promise<string[]> {
        const rows = await this.db
            .select({
                token: this.schema.user_sessions.token
            })
            .from(this.schema.user_sessions)
        .where(eq(this.schema.user_sessions.user_id, userid));

        return rows.map(row => row.token);
    }

    async get_ids_by_roleid(roleid: number): Promise<string[]> {
        const rows = await this.db
            .select({
                token: this.schema.user_sessions.token
            })
            .from(this.schema.user_sessions)
        .where(eq(this.schema.user_sessions.role_id, roleid));

        return rows.map(row => row.token);
    }

    async change_role(user_id: number, role_id: number): Promise<void> {
        await this.db
            .update(this.schema.user_sessions)
            .set({
                role_id: role_id,
            })
        .where(eq(this.schema.user_sessions.user_id, user_id));
    }

    async remove(token: string): Promise<void> {
        await this.db
            .delete(this.schema.user_sessions)
        .where(eq(this.schema.user_sessions.token, token));
    }

    async revoke_all_by_userid(user_id: number): Promise<void> {
        await this.db
            .delete(this.schema.user_sessions)
        .where(eq(this.schema.user_sessions.user_id, user_id));
    }

    async revoke_all_by_roleid(role_id: number): Promise<void> {
        await this.db
            .delete(this.schema.user_sessions)
        .where(eq(this.schema.user_sessions.role_id, role_id));
    }

    destroy() {
        // clearInterval(this.timer_id);
        // this.session_ids.clear();
        // for (let slot of this.timer_wheel) slot.clear();
        // this.timer_wheel = [];
        // this.current_slot = 0;
        // this.max_slots = 0;
        this.id_length = 0;
    }
}