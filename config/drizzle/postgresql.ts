import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/database/schema/postgresql.ts",
    out: "./database/migrations/postgresql",
    dialect: "postgresql",
});