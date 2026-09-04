import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/database/schema/mysql.ts",
    out: "./database/migrations/mysql",
    dialect: "mysql",

    dbCredentials: {
        url: "mysql://kevinadhaikal:ganteng@localhost:3306/kasirku",
    },
});