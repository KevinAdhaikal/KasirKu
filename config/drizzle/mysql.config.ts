import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "mysql",
    schema: "./src/database/schema/mysql.ts",
    out: "./database/migrations/mysql",
});
