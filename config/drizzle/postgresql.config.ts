import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/database/schema/postgresql.ts",
    out: "./database/migrations/postgresql",
});
