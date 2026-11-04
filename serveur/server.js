require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
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

// Initialisation et migration automatique de la BDD
async function initDb() {
  try {
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

      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nom VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS telephone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS adresse TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'client';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log("✅ Table 'users' synchronisée avec toutes les colonnes.");
  } catch (err) {
    console.error("❌ Erreur BDD lors de l'initialisation :", err.message);
  }
}
initDb();

// Envoi d'e-mail via l'API HTTP Brevo (Port 443 - HTTPS inbloquable)
async function sendOtpEmail(toEmail, otpCode) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || "ali.sidibe@uvci.edu";

  if (!apiKey) {
    console.log("⚠️ BREVO_API_KEY manquante dans les variables d'environnement.");
    console.log(`🔑 [CONSOLE DEV] Code 5 chiffres généré pour ${toEmail} : ${otpCode}`);
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Monan Service", email: senderEmail },
        to: [{ email: toEmail }],
        subject: "Code de réinitialisation Monan Service",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F172A;">
            <h2 style="color: #2563EB;">Monan Service</h2>
            <p>Votre code de sécurité à 5 chiffres pour réinitialiser votre mot de passe est :</p>
            <div style="background-color: #F1F5F9; padding: 15px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #F97316; margin: 20px 0;">
              ${otpCode}
            </div>
            <p style="font-size: 12px; color: #64748B;">Ce code est valable pendant 5 minutes.</p>
          </div>
        `,
      }),
    });

    if (response.ok) {
      console.log(`✉️ Email OTP envoyé avec succès à ${toEmail} via Brevo HTTP API`);
      return true;
    } else {
      const errorData = await response.json();
      console.error("❌ Erreur API Brevo :", errorData);
      console.log(`🔑 [CONSOLE DEV] Code 5 chiffres généré pour ${toEmail} : ${otpCode}`);
      return false;
    }
  } catch (err) {
    console.error("❌ Erreur réseau Brevo API :", err.message);
    console.log(`🔑 [CONSOLE DEV] Code 5 chiffres généré pour ${toEmail} : ${otpCode}`);
    return false;
  }
}

// Route Healthcheck
app.get("/", (req, res) => {
  res.send("API Monan Service Operational 🚀");
});

// 1. INSCRIPTION CLIENT & DÉPÔT
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

// 2. CONNEXION
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

// 3. DEMANDE DE CODE OTP (MOT DE PASSE OUBLIÉ)
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

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      "UPDATE users SET reset_otp = $1, otp_expires_at = $2 WHERE email = $3",
      [otp, expiresAt, cleanEmail]
    );

    await sendOtpEmail(cleanEmail, otp);

    return res.json({ success: true, message: "Un code de validation à 5 chiffres vous a été envoyé par email." });
  } catch (error) {
    console.error("❌ Erreur serveur /forgot-password :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue sur le serveur." });
  }
};

app.post("/api/auth/forgot-password", handleForgotPassword);
app.post("/forgot-password", handleForgotPassword);

// 3.5 VÉRIFICATION SEULE DU CODE OTP (SANS CHANGER LE MOT DE PASSE)
const handleVerifyOtp = async (req, res) => {
  const { email, code, otp } = req.body;
  const inputCode = code || otp;

  if (!email || !inputCode) {
    return res.status(400).json({ error: "Email et code requis." });
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

    return res.json({ success: true, message: "Code vérifié avec succès !" });
  } catch (error) {
    console.error("❌ Erreur /verify-otp :", error);
    return res.status(500).json({ error: "Erreur serveur lors de la vérification du code." });
  }
};

app.post("/api/auth/verify-otp", handleVerifyOtp);
app.post("/verify-otp", handleVerifyOtp);

// 4. VALIDATION CODE & RÉINITIALISATION DE MOT DE PASSE
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

app.post("/api/auth/reset-password", handleResetPassword);
app.post("/reset-password", handleResetPassword);

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur Monan backend démarré sur le port ${PORT}`);
});