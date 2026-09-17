import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "sqlite",
    schema: "./src/database/schema/sqlite.ts",
    out: "./database/migrations/sqlite",
});
