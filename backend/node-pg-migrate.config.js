require("dotenv").config();

module.exports = {
    migrationFileLanguage: "sql",

    dir: "./database/migrations",

    databaseUrl: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: false
    },

    migrationsTable: "schema_migrations"
};