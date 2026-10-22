const { Pool } = require('pg');

let pool;

// 1. Si nous sommes en ligne sur Render (DATABASE_URL existe)
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // 2. En local sur votre ordinateur
  pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'monan_db',
    password: '4483', // ⚠️ Remplacez ici par votre mot de passe pgAdmin / PostgreSQL
    port: 5432,
  });
}

module.exports = {
  query: (text, params) => pool.query(text, params),
};