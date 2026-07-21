import { Kysely } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("struk_settings")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("content", "text")
        .addColumn("modified_ms", "bigint")
    .execute();

    await db.insertInto("struk_settings").values({
        content: null
    }).execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("struk_settings")
    .execute();
}