require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Connexion PostgreSQL avec support SSL pour Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Initialisation et migration automatique de la base de données
async function initDb() {
  try {
    // 1. Création de la table si elle n'existe pas du tout
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255),
        telephone VARCHAR(50),
        adresse TEXT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'client',
        reset_otp VARCHAR(10),
        otp_expires_at TIMESTAMP,
        is_subscribed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Ajout dynamique des colonnes si la table existait déjà sans ces champs
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nom VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS telephone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS adresse TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'client';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log("✅ Table 'users' synchronisée avec toutes les colonnes OTP et profil.");
  } catch (err) {
    console.error("❌ Erreur BDD lors de l'initialisation :", err.message);
  }
}
initDb();

// Transporteur Nodemailer (SMTP Gmail avec Timeout de 10s)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: (process.env.SMTP_PORT || "465") === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
});

// Route Healthcheck
app.get("/", (req, res) => {
  res.send("API Monan Service Operational 🚀");
});

// -------------------------------------------------------------
// 1. INSCRIPTION CLIENT & DÉPÔT
// -------------------------------------------------------------
const handleRegister = async (req, res, defaultRole) => {
  const { nom, telephone, adresse, email, password, role } = req.body;

  if (!email || !password || !nom) {
    return res.status(400).json({ error: "Veuillez remplir les champs obligatoires." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const userRole = role || defaultRole;

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Un compte existe déjà avec cette adresse email." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (nom, telephone, adresse, email, password, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nom, telephone, adresse, email, role, is_subscribed, created_at`,
      [nom.trim(), telephone ? telephone.trim() : "", adresse ? adresse.trim() : "", cleanEmail, hashedPassword, userRole]
    );

    return res.status(201).json({
      message: "Compte créé avec succès !",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Erreur inscription :", err.message);
    return res.status(500).json({ error: "Erreur lors de la création du compte." });
  }
};

app.post("/api/auth/register-client", (req, res) => handleRegister(req, res, "client"));
app.post("/api/auth/register-depot", (req, res) => handleRegister(req, res, "depot"));

// -------------------------------------------------------------
// 2. CONNEXION (LOGIN)
// -------------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Veuillez saisir votre email et votre mot de passe." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Adresse email ou mot de passe incorrect." });
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Adresse email ou mot de passe incorrect." });
    }

    delete user.password;
    return res.json({
      message: "Connexion réussie !",
      user: user,
    });
  } catch (err) {
    console.error("❌ Erreur connexion :", err.message);
    return res.status(500).json({ error: "Erreur lors de la connexion." });
  }
});

// -------------------------------------------------------------
// 3. DEMANDE DE CODE OTP (MOT DE PASSE OUBLIÉ)
// -------------------------------------------------------------
const handleForgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Veuillez fournir une adresse email." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Cette adresse email n'est liée à aucun compte." });
    }

    // Code aléatoire à 5 chiffres
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes de validité

    await pool.query(
      "UPDATE users SET reset_otp = $1, otp_expires_at = $2 WHERE email = $3",
      [otp, expiresAt, cleanEmail]
    );

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: `"Monan Service" <${process.env.SMTP_USER}>`,
          to: cleanEmail,
          subject: "Code de réinitialisation Monan Service",
          text: `Votre code de sécurité à 5 chiffres est : ${otp} (valable 5 minutes).`,
        });
        console.log(`✉️ Email OTP envoyé avec succès à ${cleanEmail}`);
      } catch (mailErr) {
        console.error("❌ Erreur d'envoi SMTP Gmail :", mailErr.message);
        console.log(`🔑 [CONSOLE DEV] Code 5 chiffres généré pour ${cleanEmail} : ${otp}`);
      }
    } else {
      console.log(`🔑 [CONSOLE DEV] Code 5 chiffres généré pour ${cleanEmail} : ${otp}`);
    }

    return res.json({ success: true, message: "Un code de validation à 5 chiffres vous a été envoyé par email." });
  } catch (error) {
    console.error("❌ Erreur serveur /forgot-password :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue sur le serveur." });
  }
};

// Aliases pour garantir la compatibilité des routes
app.post("/api/auth/forgot-password", handleForgotPassword);
app.post("/forgot-password", handleForgotPassword);

// -------------------------------------------------------------
// 4. VALIDATION DU CODE & RÉINITIALISATION DU MOT DE PASSE
// -------------------------------------------------------------
const handleResetPassword = async (req, res) => {
  const { email, code, otp, newPassword } = req.body;
  const inputCode = code || otp;

  if (!email || !inputCode || !newPassword) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    const user = userResult.rows[0];

    if (!user.reset_otp || user.reset_otp.trim() !== inputCode.toString().trim()) {
      return res.status(400).json({ error: "Code de vérification incorrect." });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: "Le code de vérification a expiré." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password = $1, reset_otp = NULL, otp_expires_at = NULL WHERE email = $2",
      [hashedPassword, cleanEmail]
    );

    return res.json({ success: true, message: "Mot de passe réinitialisé avec succès !" });
  } catch (error) {
    console.error("❌ Erreur serveur /reset-password :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
};

// Aliases pour garantir la compatibilité des routes
app.post("/api/auth/reset-password", handleResetPassword);
app.post("/reset-password", handleResetPassword);

// Démarrage du serveur sur host 0.0.0.0
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur Monan backend démarré sur le port ${PORT}`);
});