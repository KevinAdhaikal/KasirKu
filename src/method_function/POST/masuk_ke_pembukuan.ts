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

import { sql } from "kysely";
import { global } from "../../global";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});
    
    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});
    
    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.KASIR))) return new Response("0", {status: 403});
    
    const user_data = await req.json();
    const items = user_data.items as [{
        id: number,
        jumlah_barang: number,
        harga_modal: number,
        harga_jual: number,
        nama_barang: string
    }];
    
    if (!Array.isArray(items)) return new Response("Bad Request", {status: 400});
    const now = Date.now();
    const date = new Date(now);
    const date_now = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    
    let total_barang = 0;
    let total_harga_modal = 0;
    let total_harga_jual = 0;
                
    for (const data of items) {
        total_barang += data.jumlah_barang;
        
        const barang = await db
        .selectFrom('barang')
        .select(['nama_barang', 'stok_barang', 'harga_modal', 'harga_jual'])
        .where('id', '=', data.id)
        .executeTakeFirst();
        
        if (!barang) return new Response("Not Found", { status: 404 });
        if ((barang.stok_barang - data.jumlah_barang) < 0) return new Response("1", { status: 403 });
        
        data.harga_modal = barang.harga_modal;
        data.harga_jual = barang.harga_jual;
        data.nama_barang = barang.nama_barang;
        
        total_harga_modal += data.harga_modal * data.jumlah_barang;
        total_harga_jual += data.harga_jual * data.jumlah_barang;
    }
    
    try {
        await db.transaction().execute(async (trx) => {
            const last_row  = await global.sql_dialect.insert_return_id(trx, "penjualan", {
                total_barang,
                total_harga_modal,
                total_harga_jual,
                tanggal_key: date_now,
                created_ms: now,
                modified_ms: now
            })
            
            await trx
            .insertInto('pembukuan')
            .values({
                tipe: 0,
                jumlah_uang: total_harga_jual,
                referensi_id: last_row,
                tanggal_key: date_now,
                created_ms: now,
                modified_ms: now
            })
            .execute();
            
            for (const e of items) {
                await trx
                .insertInto('penjualan_item')
                .values({
                    penjualan_id: last_row,
                    barang_id: e.id,
                    nama_barang: e.nama_barang,
                    jumlah: e.jumlah_barang,
                    harga_modal: e.harga_modal * e.jumlah_barang,
                    harga_jual: e.harga_jual * e.jumlah_barang,
                    tanggal_key: date_now,
                    created_ms: now,
                    modified_ms: now
                })
                .execute();
                
                // Update stok barang pake logic CASE WHEN
                await trx
                .updateTable('barang')
                .set({
                    stok_barang: sql`CASE 
                        WHEN stok_barang - ${e.jumlah_barang} < 0 THEN 0 
                        ELSE stok_barang - ${e.jumlah_barang} 
                    END`
                })
                .where('id', '=', e.id)
                .execute();
            }
        });
    } catch (e) {
        console.log("An error occured in post_method.ts at /masuk_ke_pembukuan:", e);
        return new Response("Internal Server Error", { status: 500 });
    }
                
    global.sse_clients.broadcast(JSON.stringify({
        type: 4,
        code: "TAMBAH_PENJUALAN",
        data: {
            items,
            tanggal_key: date_now
        }
    }));

    return new Response("", {status: 200});
}