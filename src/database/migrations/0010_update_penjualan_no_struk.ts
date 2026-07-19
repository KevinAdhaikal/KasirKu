import { Kysely, sql } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    if (["postgresql", "mysql"].includes(global.config.db_type)) {
        await db.schema
            .alterTable("penjualan")
            .addColumn("kasir_id", "integer", col => col.notNull())
            .addColumn("no_struk", "text")
        .execute()
    } else {
        await db.schema
            .createTable("penjualan_new")
            .ifNotExists()
            .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
            .addColumn("kasir_id", "integer", col => col.notNull())
            .addColumn("no_struk", "text", col => col.unique().notNull())
            .addColumn("total_barang", "integer")
            .addColumn("total_harga_modal", "integer")
            .addColumn("total_harga_jual", "integer")
            .addColumn("tanggal_key", "integer")
            .addColumn("created_ms", "bigint")
            .addColumn("modified_ms", "bigint")
            .addForeignKeyConstraint(
                "fk_penjualan_kasir",
                ["kasir_id"],
                "users",
                ["id"],
                cb => cb.onDelete("restrict").onUpdate("cascade")
            )
        .execute();

        await db.insertInto("penjualan_new")
            .expression(
                db.selectFrom("penjualan")
                .select([
                    "id",
                    sql`1`.as("kasir_id"),
                    sql`'TRX-NULL'`.as("no_struk"),
                    "total_barang",
                    "total_harga_modal",
                    "total_harga_jual",
                    "tanggal_key",
                    "created_ms",
                    "modified_ms"
                ])
            )
        .execute();

        await db.schema.dropTable("penjualan").execute();
        await db.schema.alterTable("penjualan_new").renameTo("penjualan").execute();
    }
}

export async function down(db: Kysely<any>) {
}