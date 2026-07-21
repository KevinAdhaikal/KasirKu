import { Kysely } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("store_settings")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("name", "text")
        .addColumn("description", "text")
        .addColumn("address", "text")
        .addColumn("no_phone", "text")
        .addColumn("email", "text")
        .addColumn("modified_ms", "bigint")
    .execute();

    await db.insertInto("store_settings").values({
        name: null
    }).execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("store_settings")
    .execute();
}