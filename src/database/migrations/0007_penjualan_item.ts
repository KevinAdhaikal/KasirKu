import { Kysely } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("penjualan_item")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("penjualan_id", "integer", col => col.notNull())
        .addColumn("barang_id", "integer", col => col.notNull())
        .addColumn("nama_barang", "text")
        .addColumn("jumlah", "bigint")
        .addColumn("harga_modal", "bigint")
        .addColumn("harga_jual", "bigint")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "fk_penjualan_item_penjualan",
            ["penjualan_id"],
            "penjualan",
            ["id"],
            cb => cb.onDelete("cascade").onUpdate("cascade")
        )
    .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("penjualan_item")
    .execute();
}