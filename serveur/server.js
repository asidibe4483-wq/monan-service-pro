require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { verifierJeton, verifierRole } = require("./middlewareAuth");

const app = express();
const SECRET_KEY = process.env.JWT_SECRET || 'monan_service_secret_key_securisee';

// A. EN-TÊTES DE SÉCURITÉ ET CORS RESTREINT
app.use(helmet({ hidePoweredBy: true }));

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:8081',
      'http://localhost:19006',
      'https://monan-backend.onrender.com'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Accès rejeté par la politique CORS.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" })); // Protection Anti-DoS par Payload

// B. LIMITATION DE DEBIT (RATE LIMITING)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { erreur: "Trop de requêtes émanant de cette adresse IP. Réessayez dans 15 minutes." }
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { erreur: "Trop de tentatives. Bloqué temporairement pendant 15 minutes." }
});

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
    console.log("✅ Tables BDD synchronisées.");
  } catch (err) {
    console.error("❌ Erreur BDD :", err.message);
  }
}
initDb();

app.get("/", (req, res) => res.send("API Monan Service Opérationnelle et Sécurisée 🚀"));

// --- AUTHENTIFICATION (PUBLIQUE AVEC ANTI BRUTE-FORCE) ---

app.post("/api/auth/register-client", authLimiter, async (req, res) => {
  const { nom, telephone, adresse, email, password } = req.body;
  if (!nom || !email || !password) return res.status(400).json({ error: "Champs obligatoires manquants." });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (nom, telephone, adresse, email, password, role) VALUES ($1,$2,$3,$4,$5,'client') RETURNING id, nom, email, role, telephone, adresse, is_subscribed, created_at",
      [nom.trim(), telephone, adresse, email.trim().toLowerCase(), hashedPassword]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(400).json({ error: "Email déjà utilisé ou données invalides." });
  }
});

app.post("/api/auth/register-depot", authLimiter, async (req, res) => {
  const { nom, telephone, adresse, email, password } = req.body;
  if (!nom || !email || !password) return res.status(400).json({ error: "Champs obligatoires manquants." });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (nom, telephone, adresse, email, password, role) VALUES ($1,$2,$3,$4,$5,'depot') RETURNING id, nom, email, role, telephone, adresse, is_subscribed, created_at",
      [nom.trim(), telephone, adresse, email.trim().toLowerCase(), hashedPassword]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(400).json({ error: "Email déjà utilisé." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis." });

  try {
    const result = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1", [email.trim().toLowerCase()]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Identifiants incorrects." });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Identifiants incorrects." });

    delete user.password;
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '7d' });

    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// --- ROUTES PROTEGÉES (JETON + ROLE VENDEUR/DEPOT REQUIS) ---

app.post("/api/depot/prices", verifierJeton, verifierRole('depot', 'vendeur'), async (req, res) => {
  const depot_id = req.utilisateur.id;
  const { prices } = req.body;

  if (!Array.isArray(prices)) {
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
    res.status(500).json({ error: "Erreur lors de la sauvegarde des tarifs." });
  }
});

app.get("/api/depot/prices/:depot_id", verifierJeton, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM depot_prices WHERE depot_id = $1", [req.params.depot_id]);
    res.json({ prices: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération tarifs." });
  }
});

app.post("/api/sales", verifierJeton, verifierRole('depot', 'vendeur'), async (req, res) => {
  const depot_id = req.utilisateur.id;
  const { client_nom, bouteille_type, marque, couleur, type_operation, quantite, prix_unitaire } = req.body;
  
  const qte = parseInt(quantite, 10) || 1;
  const pu = parseInt(prix_unitaire, 10) || 0;
  const total = qte * pu;

  try {
    const result = await pool.query(
      `INSERT INTO ventes (depot_id, client_nom, bouteille_type, marque, couleur, type_operation, quantite, prix_unitaire, montant_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [depot_id, client_nom || "Client Passage", bouteille_type, marque, couleur, type_operation, qte, pu, total]
    );
    res.status(201).json({ success: true, sale: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Erreur enregistrement vente." });
  }
});

app.get("/api/sales/report", verifierJeton, verifierRole('depot', 'vendeur'), async (req, res) => {
  const depot_id = req.utilisateur.id;
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
    const result = await pool.query(
      `SELECT * FROM ventes WHERE depot_id = $1 AND ${timeClause} ORDER BY created_at DESC`,
      [depot_id]
    );
    const sales = result.rows;
    const totalRecette = sales.reduce((acc, s) => acc + (parseInt(s.montant_total) || 0), 0);
    res.json({
      success: true,
      totalRecette,
      count: sales.length,
      totals: {
        b6: sales.filter(s => (s.bouteille_type || '').includes('B6')).reduce((a, s) => a + s.quantite, 0),
        b12: sales.filter(s => (s.bouteille_type || '').includes('B12')).reduce((a, s) => a + s.quantite, 0),
        b28: sales.filter(s => (s.bouteille_type || '').includes('B28')).reduce((a, s) => a + s.quantite, 0),
      },
      sales
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur bilan." });
  }
});

// Middleware Global d'erreur
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: "Requête invalide ou rejetée par la sécurité." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Serveur Monan sécurisé opérationnel sur le port ${PORT}`));