import { Kysely, sql } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    if (["postgresql", "mysql"].includes(global.config.db_type)) {
        // TODO: we have to try this.
        await db.schema
            .alterTable("penjualan_item")
            .addColumn("total_harga_modal", "bigint")
            .addColumn("total_harga_jual", "bigint")
            .execute();

        await db
            .updateTable("penjualan_item")
            .set((eb) => ({
                total_harga_modal: eb.ref("harga_modal"),
                total_harga_jual: eb.ref("harga_jual"),
            }))
            .execute();

        await db
            .updateTable("penjualan_item as pi")
            .from("barang as b")
            .set((eb) => ({
                harga_modal: eb.ref("b.harga_modal"),
                harga_jual: eb.ref("b.harga_jual"),
            }))
            .whereRef("pi.barang_id", "=", "b.id")
            .execute();

        return;
    }

    await sql`PRAGMA foreign_keys = OFF;`.execute(db);
    
    try {
        await db.schema
            .createTable("penjualan_item_new")
            .ifNotExists()
            .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
            .addColumn("penjualan_id", "integer", col => col.notNull())
            .addColumn("barang_id", "integer", col => col.notNull())
            .addColumn("nama_barang", "text")
            .addColumn("jumlah", "bigint")
            .addColumn("harga_modal", "bigint")
            .addColumn("total_harga_modal", "bigint")
            .addColumn("harga_jual", "bigint")
            .addColumn("total_harga_jual", "bigint")
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

        await db
            .insertInto("penjualan_item_new")
            .expression(
                db
                    .selectFrom("penjualan_item as pi")
                    .leftJoin("barang as b", "b.id", "pi.barang_id")
                    .select((eb) => [
                        "pi.id",
                        "pi.penjualan_id",
                        "pi.barang_id",
                        "pi.nama_barang",
                        "pi.jumlah",
                        eb.fn
                            .coalesce(
                                eb.ref("b.harga_modal"),
                                eb.ref("pi.harga_modal")
                            )
                            .as("harga_modal"),
                        "pi.harga_modal",
                        eb.fn
                            .coalesce(
                                eb.ref("b.harga_jual"),
                                eb.ref("pi.harga_jual")
                            )
                            .as("harga_jual"),
                        "pi.harga_jual",
                        "pi.tanggal_key",
                        "pi.created_ms",
                        "pi.modified_ms",
                    ])
            )
        .execute();

        await db.schema.dropTable("penjualan_item").execute();

        await db.schema
            .alterTable("penjualan_item_new")
            .renameTo("penjualan_item")
        .execute();
    } finally {
        await sql`PRAGMA foreign_keys = ON;`.execute(db);
    }
}

export async function down(db: Kysely<any>) {
}