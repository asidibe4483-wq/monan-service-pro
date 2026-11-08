const { Pool } = require('pg');
require('dotenv').config();

// Configuration avec support SSL obligatoire dès qu'une URL distante est utilisée
const configConnexion = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // Active SSL en local comme en production
      }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
      };

const pool = new Pool(configConnexion);

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base de données :', err.stack);
    } else {
        console.log('✅ Connecté avec succès à PostgreSQL !');
    }
    if (client) release();
});

module.exports = pool;