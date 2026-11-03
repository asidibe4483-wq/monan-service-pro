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

// Connexion PostgreSQL avec support SSL (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Initialisation et vérification des tables
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        reset_otp VARCHAR(10),
        otp_expires_at TIMESTAMP
      );
    `);
    console.log("✅ Table 'users' prête avec colonnes OTP à 5 chiffres.");
  } catch (err) {
    console.error("❌ Erreur BDD lors de l'initialisation :", err.message);
  }
}
initDb();

// Configuration du transporteur Nodemailer (SMTP Gmail)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: (process.env.SMTP_PORT || "465") === "465", // true pour 465 (SSL), false pour 587 (TLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000, // Timeout de 10s pour éviter le chargement infini
});

// Route Healthcheck
app.get("/", (req, res) => {
  res.send("API Monan Service Operational 🚀");
});

// Route 1 : Demande de code OTP à 5 chiffres
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Veuillez fournir une adresse email." });
  }

  try {
    // 1. Vérifier si l'utilisateur existe
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Cette adresse email n'est liée à aucun compte." });
    }

    // 2. Générer un code OTP à 5 chiffres et fixer l'expiration à 5 minutes
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 3. Enregistrer l'OTP en BDD
    await pool.query(
      "UPDATE users SET reset_otp = $1, otp_expires_at = $2 WHERE email = $3",
      [otp, expiresAt, email]
    );

    // 4. Envoi de l'e-mail avec fallback en console
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: `"Monan Service" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Code de réinitialisation Monan Service",
          text: `Votre code de sécurité à 5 chiffres est : ${otp} (valable 5 minutes).`,
        });
        console.log(`✉️ Email OTP envoyé avec succès à ${email}`);
      } catch (mailErr) {
        console.error("❌ Erreur d'envoi SMTP Gmail :", mailErr.message);
        console.log(`🔑 [CONSOLE DEV] Code 5 chiffres généré pour ${email} : ${otp}`);
      }
    } else {
      console.log(`🔑 [CONSOLE DEV] Code 5 chiffres généré pour ${email} : ${otp}`);
    }

    // 5. Réponse HTTP garantie pour débloquer l'application
    return res.json({ success: true, message: "Un code de validation à 5 chiffres vous a été envoyé." });
  } catch (error) {
    console.error("❌ Erreur serveur sur /forgot-password :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// Route 2 : Validation du code et changement de mot de passe
app.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  try {
    // 1. Recherche de l'utilisateur
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    const user = userResult.rows[0];

    // 2. Vérification du code OTP et de la date d'expiration
    if (!user.reset_otp || user.reset_otp !== otp.toString().trim()) {
      return res.status(400).json({ error: "Code de vérification incorrect." });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: "Le code de vérification a expiré." });
    }

    // 3. Mise à jour du mot de passe et réinitialisation des champs OTP
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password = $1, reset_otp = NULL, otp_expires_at = NULL WHERE email = $2",
      [hashedPassword, email]
    );

    return res.json({ success: true, message: "Mot de passe réinitialisé avec succès !" });
  } catch (error) {
    console.error("❌ Erreur serveur sur /reset-password :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
});

// Démarrage du serveur sur host 0.0.0.0 pour Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur Monan backend démarré sur le port ${PORT}`);
});