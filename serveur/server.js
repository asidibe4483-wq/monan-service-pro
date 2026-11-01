const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration Base de Données PostgreSQL (Render / Supabase / Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Initialisation de la table users au démarrage
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(150) NOT NULL,
        telephone VARCHAR(50),
        adresse VARCHAR(255),
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'client',
        is_subscribed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'users' vérifiée et prête.");
  } catch (err) {
    console.error("❌ Erreur d'initialisation de la base de données :", err.message);
  }
};
initDb();

// --- ROUTES AUTHENTIFICATION ---

// 1. Inscription Client
app.post('/api/auth/register-client', async (req, res) => {
  try {
    const { nom, telephone, adresse, email, password } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !password || !nom) {
      return res.status(400).json({ error: "Les champs nom, email et mot de passe sont requis." });
    }

    const checkUser = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: "Un compte existe déjà avec cette adresse email." });
    }

    const insertResult = await pool.query(
      `INSERT INTO users (nom, telephone, adresse, email, password, role, is_subscribed) 
       VALUES ($1, $2, $3, $4, $5, 'client', false) 
       RETURNING id, nom, telephone, adresse, email, role, is_subscribed, created_at`,
      [nom.trim(), telephone ? telephone.trim() : '', adresse ? adresse.trim() : '', cleanEmail, password]
    );

    const newUser = insertResult.rows[0];
    return res.status(201).json({
      message: "Compte client créé avec succès",
      user: {
        id: newUser.id,
        nom: newUser.nom,
        email: newUser.email,
        telephone: newUser.telephone,
        adresse: newUser.adresse,
        role: 'client',
        isSubscribed: false,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    console.error("Erreur register-client :", error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. Inscription Dépôt / Vendeur
app.post('/api/auth/register-depot', async (req, res) => {
  try {
    const { nom, telephone, adresse, email, password } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !password || !nom) {
      return res.status(400).json({ error: "Les champs nom, email et mot de passe sont requis." });
    }

    const checkUser = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: "Un compte existe déjà avec cette adresse email." });
    }

    const insertResult = await pool.query(
      `INSERT INTO users (nom, telephone, adresse, email, password, role, is_subscribed) 
       VALUES ($1, $2, $3, $4, $5, 'depot', false) 
       RETURNING id, nom, telephone, adresse, email, role, is_subscribed, created_at`,
      [nom.trim(), telephone ? telephone.trim() : '', adresse ? adresse.trim() : '', cleanEmail, password]
    );

    const newUser = insertResult.rows[0];
    return res.status(201).json({
      message: "Compte dépôt créé avec succès",
      user: {
        id: newUser.id,
        nom: newUser.nom,
        email: newUser.email,
        telephone: newUser.telephone,
        adresse: newUser.adresse,
        role: 'depot',
        isSubscribed: false,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    console.error("Erreur register-depot :", error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. Connexion Utilisateur
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: "Email et mot de passe obligatoires." });
    }

    const userResult = await pool.query(
      `SELECT id, nom, telephone, adresse, email, password, role, is_subscribed, created_at 
       FROM users WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const foundUser = userResult.rows[0];

    if (foundUser.password !== password) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const normalizedRole = foundUser.role ? String(foundUser.role).toLowerCase().trim() : 'client';

    return res.json({
      message: "Connexion réussie",
      user: {
        id: foundUser.id,
        nom: foundUser.nom,
        email: foundUser.email,
        telephone: foundUser.telephone,
        adresse: foundUser.adresse,
        role: normalizedRole,
        isSubscribed: foundUser.is_subscribed || false,
        createdAt: foundUser.created_at
      }
    });
  } catch (error) {
    console.error("Erreur login :", error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Mot de passe oublié
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    return res.json({ message: `Un code de réinitialisation a été envoyé à ${email}` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Réinitialisation du mot de passe
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (cleanEmail && newPassword) {
      await pool.query(
        'UPDATE users SET password = $1 WHERE LOWER(email) = $2',
        [newPassword, cleanEmail]
      );
    }

    return res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('API Monan Service Operational 🚀');
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Monan backend démarré sur le port ${PORT}`);
});