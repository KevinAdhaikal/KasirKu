import { Kysely } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("retur_barang")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("tanggal_key", "integer", col => col.notNull())
        .addColumn("barang_id", "integer", col => col.notNull())
        .addColumn("deskripsi", "text", col => col.defaultTo(null))
        .addColumn("jumlah_barang", "integer", col => col.notNull())
        .addColumn("created_ms", "bigint", col => col.notNull())
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "fk_retur_barang_barang",
            ["barang_id"],
            "barang",
            ["id"],
            cb => cb.onDelete("cascade").onUpdate("cascade")
        )
    .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("retur_barang")
    .execute();
}