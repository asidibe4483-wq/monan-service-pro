const express = require('express');
const cors = require('cors');
const config = require('./config/config');

const app = express();

// 1. Configuration CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqué par la politique CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Base de données temporaire en mémoire (Si DB non connectée)
const users = [];

// 4. Route Healthcheck (Vérification de statut)
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API Monan Service opérationnelle' });
});

// 5. Routes d'authentification
app.post('/api/auth/register-depot', (req, res) => {
  const { nom, telephone, adresse, email, password } = req.body;
  if (!email || !password || !nom) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
  }

  const existingUser = users.find(u => u.email === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ message: 'Un compte existe déjà avec cet e-mail.' });
  }

  const newUser = { id: Date.now(), nom, telephone, adresse, email: email.toLowerCase(), role: 'depot' };
  users.push({ ...newUser, password });

  return res.status(201).json({ message: 'Compte Dépôt créé avec succès', user: newUser });
});

app.post('/api/auth/register-client', (req, res) => {
  const { nom, telephone, adresse, email, password } = req.body;
  if (!email || !password || !nom) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
  }

  const existingUser = users.find(u => u.email === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ message: 'Un compte existe déjà avec cet e-mail.' });
  }

  const newUser = { id: Date.now(), nom, telephone, adresse, email: email.toLowerCase(), role: 'client' };
  users.push({ ...newUser, password });

  return res.status(201).json({ message: 'Compte Client créé avec succès', user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Veuillez saisir votre email et mot de passe.' });
  }

  const user = users.find(u => u.email === email.toLowerCase());
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  return res.status(200).json({ message: 'Connexion réussie', user: userWithoutPassword });
});

// 6. SÉCURITÉ ANTI-CRASH MOBILE : Capture des routes 404 en JSON pur
app.use((req, res) => {
  res.status(404).json({ error: `La route ${req.originalUrl} n'existe pas sur le serveur.` });
});

// 7. Gestionnaire global d'erreurs en JSON
app.use((err, req, res, next) => {
  console.error('Erreur Serveur:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur'
  });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Serveur Monan Service démarré sur le port ${PORT}`);
});