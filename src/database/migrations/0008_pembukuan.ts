import { Kysely, sql } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("pembukuan")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("tipe", "integer", col => col.check(sql`tipe IN (0,1)`))
        .addColumn("deskripsi", "text", col => col.defaultTo(null))
        .addColumn("jumlah_uang", "integer")
        .addColumn("referensi_id", "integer")
        .addColumn("tanggal_key", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
    .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("pembukuan")
    .execute();
}