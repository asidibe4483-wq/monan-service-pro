// Importation de l'outil 'pg' pour parler à PostgreSQL
const { Pool } = require('pg');
// Importation de dotenv pour lire notre fichier .env
require('dotenv').config();

// Configuration de la connexion
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

// Test de la connexion au démarrage
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base de données :', err.stack);
    } else {
        console.log('✅ Connecté avec succès à PostgreSQL (monan_db) !');
    }
    // On libère le client après le test
    if (client) release();
});

// On exporte notre pool pour pouvoir l'utiliser ailleurs
module.exports = pool;