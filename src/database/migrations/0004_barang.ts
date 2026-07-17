import { Kysely, sql } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("barang")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("nama_barang", "text")
        .addColumn("stok_barang", "integer")
        .addColumn("kategori_barang_id", "integer")
        .addColumn("harga_modal", "integer")
        .addColumn("harga_jual", "integer")
        .addColumn("barcode_barang", "text", col => col.unique().defaultTo(null))
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "barang_kategori_fk",
            ["kategori_barang_id"],
            "kategori_barang",
            ["id"],
            (cb) => cb.onDelete("cascade").onUpdate("cascade")
        )
    .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("barang")
    .execute();
}