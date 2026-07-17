import { Kysely } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("penjualan")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("total_barang", "integer")
        .addColumn("total_harga_modal", "integer")
        .addColumn("total_harga_jual", "integer")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
    .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("penjualan")
    .execute();
}

