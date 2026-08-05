const required = [
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "JWT_ACCESS_SECRET",
    "REDIS_HOST"
];

const missing = required.filter(key => !process.env[key]);

if (missing.length) {
    console.error("\n❌ Missing environment variables:");
    missing.forEach(v => console.error(` - ${v}`));
    process.exit(1);
}

module.exports = true;