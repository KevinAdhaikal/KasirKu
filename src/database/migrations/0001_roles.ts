import { Kysely, sql } from "kysely";
import { global } from "../../global";

export async function up(db: Kysely<any>) {
    const current_ms = Date.now()
    
    await db.schema.createTable("roles").ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("name", "varchar(255)", col => col.unique())
        .addColumn("permission_level", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
    .execute();

    await global.sql_dialect.insert_ignore(db.insertInto("roles").values({
        name: "Administrator",
        permission_level: global.permissions.ADMINISTRATOR,
        created_ms: current_ms,
        modified_ms: current_ms
    })).execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("roles")
    .execute();
}