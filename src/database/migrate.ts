import { migrations } from "./migrations";
import { Kysely } from "kysely";

export async function migrate_up( db: Kysely<any>, current_version: number) {
    for (const migration of migrations) {
        if (migration.version > current_version) {
            try {
                await migration.up(db);
                console.log(`[INFO] Migration "${migration.name}" completed successfully.`);
            } catch (error) {
                console.error(`[ERROR] Migration "${migration.name}" failed.`, error);
                throw error;
            }
        }
    }
}

export async function migrate_down(db: Kysely<any>) {
    for (const migration of [...migrations].reverse()) {
        try {
            await migration.down(db);
            console.log(`[INFO] Rollback for "${migration.name}" completed successfully.`);
        } catch (error) {
            console.error(`[ERROR] Rollback for "${migration.name}" failed.`, error);
            throw error;
        }
    }
}