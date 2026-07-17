import { Kysely, sql } from "kysely";
import { global } from "../../global";
import { get_password_hash_only } from "../../utils/utils";

export async function up(db: Kysely<any>) {
    const current_ms = Date.now()
    
    await db.schema
        .createTable("users")
        .ifNotExists()
        .addColumn("id", "integer", col => global.sql_dialect.id_column(col))
        .addColumn("username", "varchar(255)", col => col.unique())
        .addColumn("full_name", "text")
        .addColumn("password_hash", "text")
        .addColumn("profile_img", "text", col => col.defaultTo(null))
        .addColumn("role_id", "integer")
        .addColumn("created_ms", "bigint")
        .addColumn("modified_ms", "bigint")
        .addForeignKeyConstraint(
            "users_role_fk", // nama constraint nya (kalo di sqlite mah di ignore)
            ["role_id"],
            "roles",
            ["id"],
            (cb) => cb.onDelete("cascade").onUpdate("cascade")
        )
    .execute();

    await global.sql_dialect.insert_ignore(db.insertInto("users").values({
        username: "admin",
        full_name: "Administrator",
        password_hash: get_password_hash_only(
            Bun.password.hashSync("admin", {
                algorithm: "argon2id",
                timeCost: global.ph_timecost,
                memoryCost: global.ph_memorycost,
            }),
        ),
        role_id: 1,
        created_ms: current_ms,
        modified_ms: current_ms
    })).execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .dropTable("users")
    .execute();
}