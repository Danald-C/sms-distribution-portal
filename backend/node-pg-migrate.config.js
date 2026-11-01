require("dotenv").config();

/* module.exports = {
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
}; */

/* module.exports = {
    db: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: false
    },

    "migrations-dir": "./database/migrations",
    "migrations-table": "pgmigrations",
    "migration-file-language": "sql"
}; */

require('dotenv').config();

module.exports = {
  db: {
    host: process.env.DB_HOST || process.env.POSTGRES_SERVER || 'localhost',
    port: Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432),
    database: process.env.DB_NAME || process.env.POSTGRES_DB,
    user: process.env.DB_USER || process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
    ssl: false
  },

  dir: './database/migrations',
  migrationsTable: 'pgmigrations',
  direction: 'up',
  // migrationFileLanguage: 'cjs'
  migrationFileLanguage: 'sql'
};