import pg from "pg";

const client = new pg.Client({
  host: "127.0.0.1",
  port: 5432,
  user: "postgres",
  database: "postgres"
});

await client.connect();
console.log("connected");