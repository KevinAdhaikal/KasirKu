import { sql } from "kysely";
import { global } from "../../global";

export default async function(req: Request, token: string) {
    const user_info = global.user_sessions.get(token);
    if (!token || !user_info) return new Response("Unauthorized", {status: 401});

    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_PEMBUKUAN))) return new Response("0", {status: 403});

    const user_input = new URLSearchParams(await req.text());

    const id = Number(user_input.get("id"));
    const tanggal_key = Number(user_input.get("tanggal_key"));

    if (isNaN(id) || !id || isNaN(tanggal_key) || !tanggal_key) return new Response("Bad Request", {status: 400});

    const res = await db
    .selectFrom('barang_masuk')
    .select(['jumlah_barang', 'barang_id'])
    .where('id', '=', id)
    .where('tanggal_key', '=', tanggal_key)
    .executeTakeFirst();

    if (!res) return new Response("Not Found", {status: 404});

    let stok_barang;
    try {
        stok_barang = await db.transaction().execute(async (trx) => {
            await trx.updateTable("barang")
            .set({
                stok_barang: sql`stok_barang - ${res.jumlah_barang}`
            })
            .where("id", "=", res.barang_id)
            .execute();
            
            await trx.deleteFrom("barang_masuk").where("id", "=", id).where("tanggal_key", "=", tanggal_key).execute();
            return (await trx.selectFrom("barang").select("stok_barang").where("id", "=", res.barang_id).executeTakeFirst())?.stok_barang;
        });
    } catch(e) {
        return new Response("Internal Server Error", {status: 500});
    }

    global.sse_clients.broadcast(JSON.stringify({
        type: 6,
        code: "DELETE_BARANG_MASUK",
        data: {
            id,
            tanggal_key
        }
    }));
    global.sse_clients.broadcast(JSON.stringify({
        type: 2,
        code: "UPDATE_BARANG",
        data: {
            id: res.barang_id,
            stok_barang
        }
    }))

    return new Response("", {status: 200});
}