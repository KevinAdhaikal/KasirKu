import { user_session_interface } from "../../user_session/user_session";
import { global } from "../../global";

export default async function(req: Request, url: URL, user_info: user_session_interface) {
    const db = global.database;
    if (!db) return new Response("Internal Server Error", {status: 500});
    const res_role = await db.selectFrom('roles').select('permission_level').where('id', '=', user_info.role_id).executeTakeFirst();
    if (!res_role) return new Response("Internal Server Error", {status: 500});

    if (!(res_role.permission_level & (global.permissions.ADMINISTRATOR | global.permissions.MANAGE_BARANG))) return new Response("0", {status: 403});

    const user_input = url.searchParams;
    const id = Number(user_input.get("id"));

    let res;
    if (!isNaN(id) && id) {
        res = await db
        .selectFrom('retur_barang as rb')
        .innerJoin('barang as b', 'b.id', 'rb.barang_id')
        .select([
            'b.nama_barang',
            'b.barcode_barang',
            'rb.deskripsi',
            'rb.jumlah_barang'
        ])
        .where('rb.id', '=', id)
        .executeTakeFirst();
    }
    else {
        const tanggal_key = Number(user_input.get("tanggal_key"));
        if (isNaN(tanggal_key) || !tanggal_key) return new Response("Bad Reuqest", {status: 400});
        
        res = await db
        .selectFrom('retur_barang as rb')
        .innerJoin('barang as b', 'b.id', 'rb.barang_id')
        .select([
            'rb.id',
            'b.nama_barang',
            'rb.deskripsi',
            'rb.jumlah_barang'
        ])
        .where('rb.tanggal_key', '=', tanggal_key)
        .execute();
    }

    return new Response(JSON.stringify(res), {status: 200});
}