const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration Base de Données PostgreSQL (Render / Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Service d'envoi d'emails (Nodemailer avec variables d'environnement)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true pour le port 465, false pour les autres
  auth: {
    user: process.env.SMTP_USER, // Votre adresse email d'envoi
    pass: process.env.SMTP_PASS, // Votre mot de passe d'application SMTP
  },
});

// Initialisation & Mise à jour des colonnes de la table users
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
        reset_code VARCHAR(10),
        reset_expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ajout dynamique des colonnes de sécurité si la table existait déjà
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMP WITH TIME ZONE;
    `);

    console.log("✅ Table 'users' et colonnes de sécurité vérifiées.");
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

    const checkUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
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

    const checkUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
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
      return res.status(401).json({ error: "Aucun compte associé à cette adresse email." });
    }

    const foundUser = userResult.rows[0];

    if (foundUser.password !== password) {
      return res.status(401).json({ error: "Mot de passe incorrect." });
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

// 4. Demande de code de réinitialisation (OTP)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanEmail) {
      return res.status(400).json({ error: "Adresse email requise." });
    }

    // VÉRIFICATION D'EXISTENCE DU COMPTE
    const userResult = await pool.query('SELECT id, nom FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Aucun compte n'est enregistré avec cet email." });
    }

    const user = userResult.rows[0];

    // Génération d'un code OTP aléatoire à 6 chiffres
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Date d'expiration fixée à 5 minutes (300 000 ms)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Enregistrement de l'OTP temporaire en base de données
    await pool.query(
      'UPDATE users SET reset_code = $1, reset_expires_at = $2 WHERE LOWER(email) = $3',
      [generatedCode, expiresAt, cleanEmail]
    );

    // Envoi de l'email si le serveur SMTP est configuré
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: '"Monan Service" <no-reply@monan-service.com>',
        to: cleanEmail,
        subject: "Code de réinitialisation - Monan Service",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A;">
            <h2>Réinitialisation de mot de passe</h2>
            <p>Bonjour <strong>${user.nom}</strong>,</p>
            <p>Voici votre code de sécurité unique pour réinitialiser votre mot de passe :</p>
            <div style="font-size: 28px; font-weight: bold; color: #F97316; letter-spacing: 4px; margin: 20px 0;">
              ${generatedCode}
            </div>
            <p>Ce code est valable pendant <strong>5 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
          </div>
        `
      });
    } else {
      console.log(`⚠️ Mode Développement (SMTP non configuré) : Code généré pour ${cleanEmail} = ${generatedCode}`);
    }

    return res.json({ 
      message: `Code de vérification envoyé à l'adresse ${cleanEmail}. Il expirera dans 5 minutes.` 
    });
  } catch (error) {
    console.error("Erreur forgot-password :", error);
    return res.status(500).json({ error: "Erreur lors de la génération du code de sécurité." });
  }
});

// 5. Validation du code et mise à jour du mot de passe
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanCode = code ? code.trim() : '';

    if (!cleanEmail || !cleanCode || !newPassword) {
      return res.status(400).json({ error: "Veuillez remplir tous les champs requis." });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 4 caractères." });
    }

    // Récupération des informations de sécurité de l'utilisateur
    const userResult = await pool.query(
      'SELECT id, reset_code, reset_expires_at FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Compte introuvable." });
    }

    const user = userResult.rows[0];

    if (!user.reset_code || !user.reset_expires_at) {
      return res.status(400).json({ error: "Aucune demande de réinitialisation active. Veuillez redemander un code." });
    }

    // VÉRIFICATION DE LA CORRESPONDANCE DU CODE
    if (user.reset_code !== cleanCode) {
      return res.status(400).json({ error: "Code de vérification incorrect." });
    }

    // VÉRIFICATION DE LA PÉREMPTION (5 MINUTES)
    const now = new Date();
    const expiresAt = new Date(user.reset_expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ error: "Le code de vérification a expiré (valable 5 minutes). Veuillez en demander un nouveau." });
    }

    // Mettre à jour le mot de passe et réinitialiser les jetons OTP
    await pool.query(
      'UPDATE users SET password = $1, reset_code = NULL, reset_expires_at = NULL WHERE LOWER(email) = $2',
      [newPassword, cleanEmail]
    );

    return res.json({ message: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter." });
  } catch (error) {
    console.error("Erreur reset-password :", error);
    return res.status(500).json({ error: "Impossible de mettre à jour le mot de passe." });
  }
});

// Root Health Check
app.get('/', (req, res) => {
  res.send('API Monan Service Operational 🚀');
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Monan backend démarré sur le port ${PORT}`);
});