import { Kysely, sql } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    const current_ms = Date.now()
    
    await db.schema
        .createTable("kategori_barang")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("nama_kategori", "text", col => col.unique())
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
    .execute();

    await global.sql_dialect.insert_ignore(db.insertInto("kategori_barang")
        .values({
            nama_kategori: "Tidak Ada",
            created_ms: current_ms,
            modified_ms: current_ms
        }
    )).execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("kategori_barang")
    .execute();
}