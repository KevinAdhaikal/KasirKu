import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/database/schema/sqlite.ts",
    out: "./database/migrations/sqlite",
    dialect: "sqlite",
});