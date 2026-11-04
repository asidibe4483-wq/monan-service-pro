require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

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

      CREATE TABLE IF NOT EXISTS ventes (
        id SERIAL PRIMARY KEY,
        depot_id INTEGER,
        client_nom VARCHAR(255),
        bouteille_type VARCHAR(50),
        marque VARCHAR(100),
        couleur VARCHAR(50),
        type_operation VARCHAR(50) DEFAULT 'Recharge',
        quantite INTEGER NOT NULL,
        prix_unitaire INTEGER NOT NULL,
        montant_total INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Table de paramétrage personnalisé des prix par Dépôt / Vendeur
      CREATE TABLE IF NOT EXISTS depot_prices (
        id SERIAL PRIMARY KEY,
        depot_id INTEGER NOT NULL,
        format VARCHAR(20) NOT NULL,
        prix_recharge INTEGER NOT NULL,
        prix_achat INTEGER NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(depot_id, format)
      );
    `);
    console.log("✅ Tables BDD synchronisées avec gestion des prix personnalisés vendeurs.");
  } catch (err) {
    console.error("❌ Erreur BDD :", err.message);
  }
}
initDb();

// Service Email OTP via Brevo
async function sendOtpEmail(toEmail, otpCode) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || "ali.sidibe@uvci.edu";

  if (!apiKey) {
    console.log(`🔑 [DEV] Code OTP pour ${toEmail} : ${otpCode}`);
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
          <div style="font-family: Arial; padding: 20px;">
            <h2>Monan Service</h2>
            <p>Votre code de validation à 5 chiffres est :</p>
            <h1 style="color: #F97316; letter-spacing: 5px;">${otpCode}</h1>
          </div>
        `,
      }),
    });
    return response.ok;
  } catch (err) {
    console.error("❌ Erreur Brevo :", err.message);
    return false;
  }
}

app.get("/", (req, res) => res.send("API Monan Service Opérationnelle 🚀"));

// Authentification
app.post("/api/auth/register-client", async (req, res) => {
  const { nom, telephone, adresse, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (nom, telephone, adresse, email, password, role) VALUES ($1,$2,$3,$4,$5,'client') RETURNING *",
      [nom, telephone, adresse, email.trim().toLowerCase(), hashedPassword]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: "Email déjà utilisé ou données invalides." });
  }
});

app.post("/api/auth/register-depot", async (req, res) => {
  const { nom, telephone, adresse, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (nom, telephone, adresse, email, password, role) VALUES ($1,$2,$3,$4,$5,'depot') RETURNING *",
      [nom, telephone, adresse, email.trim().toLowerCase(), hashedPassword]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: "Email déjà utilisé." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Identifiants incorrects." });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Identifiants incorrects." });

    delete user.password;
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GESTION DES TARIFS PERSONNALISÉS PAR LE VENDEUR
app.post("/api/depot/prices", async (req, res) => {
  const { depot_id, prices } = req.body; // prices: [{ format: 'B6', prix_recharge: 2000, prix_achat: 13000 }, ...]
  if (!depot_id || !Array.isArray(prices)) {
    return res.status(400).json({ error: "Données de prix invalides." });
  }

  try {
    for (const p of prices) {
      await pool.query(
        `INSERT INTO depot_prices (depot_id, format, prix_recharge, prix_achat, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (depot_id, format) 
         DO UPDATE SET prix_recharge = EXCLUDED.prix_recharge, prix_achat = EXCLUDED.prix_achat, updated_at = NOW()`,
        [depot_id, p.format, p.prix_recharge, p.prix_achat]
      );
    }
    res.json({ success: true, message: "Tarifs mis à jour avec succès !" });
  } catch (err) {
    console.error("❌ Erreur enregistrement prix :", err.message);
    res.status(500).json({ error: "Erreur lors de la sauvegarde des tarifs." });
  }
});

app.get("/api/depot/prices/:depot_id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM depot_prices WHERE depot_id = $1", [req.params.depot_id]);
    res.json({ prices: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération tarifs." });
  }
});

// Ventes et Bilans
app.post("/api/sales", async (req, res) => {
  const { depot_id, client_nom, bouteille_type, marque, couleur, type_operation, quantite, prix_unitaire } = req.body;
  const qte = parseInt(quantite, 10);
  const pu = parseInt(prix_unitaire, 10);
  const total = qte * pu;

  try {
    const result = await pool.query(
      `INSERT INTO ventes (depot_id, client_nom, bouteille_type, marque, couleur, type_operation, quantite, prix_unitaire, montant_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [depot_id || null, client_nom || "Client Passage", bouteille_type, marque, couleur, type_operation, qte, pu, total]
    );
    res.status(201).json({ success: true, sale: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Erreur enregistrement vente." });
  }
});

app.get("/api/sales/report", async (req, res) => {
  const { period, date_offset } = req.query;
  const offset = parseInt(date_offset, 10) || 0;

  let timeClause = "created_at >= CURRENT_DATE";
  if (period === 'day' && offset !== 0) {
    const start = Math.abs(offset);
    timeClause = `created_at >= CURRENT_DATE - INTERVAL '${start} days' AND created_at < CURRENT_DATE - INTERVAL '${start - 1} days'`;
  } else if (period === 'week') {
    timeClause = "created_at >= NOW() - INTERVAL '7 days'";
  } else if (period === 'month') {
    timeClause = "DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)";
  } else if (period === 'year') {
    timeClause = "DATE_TRUNC('year', created_at) = DATE_TRUNC('year', CURRENT_DATE)";
  }

  try {
    const result = await pool.query(`SELECT * FROM ventes WHERE ${timeClause} ORDER BY created_at DESC`);
    const sales = result.rows;
    const totalRecette = sales.reduce((acc, s) => acc + (parseInt(s.montant_total) || 0), 0);
    res.json({
      success: true,
      totalRecette,
      count: sales.length,
      totals: {
        b6: sales.filter(s => s.bouteille_type.includes('B6')).reduce((a, s) => a + s.quantite, 0),
        b12: sales.filter(s => s.bouteille_type.includes('B12')).reduce((a, s) => a + s.quantite, 0),
        b28: sales.filter(s => s.bouteille_type.includes('B28')).reduce((a, s) => a + s.quantite, 0),
      },
      sales
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur bilan." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Serveur Monan backend sur port ${PORT}`));