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

import { global } from "../../global";

export default async function(req: Request, token: string) {
    if (!token) return new Response("Bad Request", {status: 400});
            
    global.user_sessions.remove(token);
    global.sse_clients.remove(token);
    
    return new Response("", {status: 200, headers: {
        "set-cookie": "token=; Path=/; Max-Age=0"
    }});
}