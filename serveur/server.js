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

// Service SMTP d'envoi d'emails (Nodemailer)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Initialisation BDD & Colonnes de sécurité OTP
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

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMP WITH TIME ZONE;
    `);

    console.log("✅ Table 'users' prête avec colonnes OTP à 5 chiffres.");
  } catch (err) {
    console.error("❌ Erreur BDD :", err.message);
  }
};
initDb();

// --- ROUTES D'AUTHENTIFICATION ---

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
      return res.status(400).json({ error: "Un compte existe déjà avec cet email." });
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
      return res.status(400).json({ error: "Un compte existe déjà avec cet email." });
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
    return res.status(500).json({ error: error.message });
  }
});

// 3. Connexion
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
      return res.status(401).json({ error: "Aucun compte n'est enregistré avec cette adresse email." });
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
    return res.status(500).json({ error: error.message });
  }
});

// 4. Génération & Envoi du Code à 5 chiffres (Validité : 5 minutes)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanEmail) {
      return res.status(400).json({ error: "Veuillez saisir votre adresse email." });
    }

    // VÉRIFICATION D'EXISTENCE EN BDD
    const userResult = await pool.query('SELECT id, nom FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Cette adresse email n'est liée à aucun compte Monan Service." });
    }

    const user = userResult.rows[0];

    // Génération d'un code OTP à 5 chiffres (entre 10000 et 99999)
    const generatedCode = Math.floor(10000 + Math.random() * 90000).toString();

    // Expiration à 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Mise à jour BDD
    await pool.query(
      'UPDATE users SET reset_code = $1, reset_expires_at = $2 WHERE LOWER(email) = $3',
      [generatedCode, expiresAt, cleanEmail]
    );

    // Envoi de l'email via SMTP s'il est configuré
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: '"Monan Service" <no-reply@monan-service.com>',
        to: cleanEmail,
        subject: "Code de réinitialisation (5 chiffres) - Monan Service",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A;">
            <h2 style="color: #F97316;">Monan Service</h2>
            <p>Bonjour <strong>${user.nom}</strong>,</p>
            <p>Voici votre code de réinitialisation de mot de passe à 5 chiffres :</p>
            <div style="font-size: 32px; font-weight: bold; color: #0F172A; letter-spacing: 6px; background: #F1F5F9; padding: 12px 20px; display: inline-block; border-radius: 8px; margin: 16px 0;">
              ${generatedCode}
            </div>
            <p>Ce code est strictement personnel et expire dans <strong>5 minutes</strong>.</p>
          </div>
        `
      });
    } else {
      console.log(`🔑 [CONSOLE DEV] Code 5 chiffres généré pour ${cleanEmail} : ${generatedCode}`);
    }

    return res.json({
      message: `Un code de sécurité à 5 chiffres a été envoyé à ${cleanEmail}. Il est valable pendant 5 minutes.`
    });
  } catch (error) {
    console.error("Erreur forgot-password:", error);
    return res.status(500).json({ error: "Erreur lors de la création du code de réinitialisation." });
  }
});

// 5. Vérification du Code 5 chiffres & Mise à jour du mot de passe
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanCode = code ? code.trim() : '';

    if (!cleanEmail || !cleanCode || !newPassword) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    if (cleanCode.length !== 5) {
      return res.status(400).json({ error: "Le code de réinitialisation doit comporter exactement 5 chiffres." });
    }

    const userResult = await pool.query(
      'SELECT id, reset_code, reset_expires_at FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Compte utilisateur introuvable." });
    }

    const user = userResult.rows[0];

    if (!user.reset_code || !user.reset_expires_at) {
      return res.status(400).json({ error: "Aucun code actif. Veuillez demander un nouveau code à 5 chiffres." });
    }

    // VÉRIFICATION DE LA CORRESPONDANCE DU CODE (STRICT)
    if (user.reset_code !== cleanCode) {
      return res.status(400).json({ error: "Le code à 5 chiffres saisi est incorrect." });
    }

    // VÉRIFICATION D'EXPIRATION (5 MINUTES)
    const now = new Date();
    const expiresAt = new Date(user.reset_expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ error: "Ce code à 5 chiffres a expiré (valable 5 minutes). Veuillez en générer un nouveau." });
    }

    // Mise à jour du mot de passe et suppression du jeton
    await pool.query(
      'UPDATE users SET password = $1, reset_code = NULL, reset_expires_at = NULL WHERE LOWER(email) = $2',
      [newPassword, cleanEmail]
    );

    return res.json({ message: "Votre mot de passe a été modifié avec succès. Vous pouvez vous connecter." });
  } catch (error) {
    console.error("Erreur reset-password:", error);
    return res.status(500).json({ error: "Échec de la réinitialisation du mot de passe." });
  }
});

app.get('/', (req, res) => {
  res.send('API Monan Service Operational 🚀');
});

// ÉCOUTE STRICTE SUR 0.0.0.0 (INDISPENSABLE POUR RENDER)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Monan backend démarré sur le port ${PORT}`);
});