const express = require('express');
const cors = require('cors');
const config = require('./config/config');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Route racine d'inspection
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API Monan Service opérationnelle',
    routesDisponibles: [
      'POST /api/auth/login',
      'POST /api/auth/register-depot',
      'POST /api/auth/register-client'
    ]
  });
});

// 1. Connexion
app.post('/api/auth/login', (req, res) => {
  console.log(' Requête de connexion reçue :', req.body);
  const { email } = req.body;
  return res.status(200).json({
    message: 'Connexion réussie',
    user: { email, nom: email.split('@')[0], role: 'client' }
  });
});

// 2. Inscription Dépôt
app.post('/api/auth/register-depot', (req, res) => {
  console.log(' Requête inscription dépôt reçue :', req.body);
  const { nom, email, telephone, adresse } = req.body;
  return res.status(201).json({
    message: 'Dépôt créé',
    user: { nom, email, telephone, adresse, role: 'depot' }
  });
});

// 3. Inscription Client
app.post('/api/auth/register-client', (req, res) => {
  console.log(' Requête inscription client reçue :', req.body);
  const { nom, email, telephone, adresse } = req.body;
  return res.status(201).json({
    message: 'Client créé',
    user: { nom, email, telephone, adresse, role: 'client' }
  });
});

// Route 404 claire en JSON
app.use((req, res) => {
  res.status(404).json({
    error: '404 Not Found',
    message: `La route ${req.method} ${req.url} n'existe pas.`
  });
});

const PORT = config.port || 5000;
app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));