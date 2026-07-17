import { Kysely } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("barang_masuk")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("barang_id", "integer")
        .addColumn("deskripsi", "text")
        .addColumn("jumlah_barang", "integer")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "fk_barang_masuk_barang",
            ["barang_id"],
            "barang",
            ["id"],
            cb => cb.onDelete("cascade").onUpdate("cascade")
        )
    .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("barang_masuk")
    .execute();
}