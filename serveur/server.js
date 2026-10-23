const express = require('express');
const cors = require('cors');
const config = require('./config/config');

const app = express();

// Configuration du middleware CORS pour le serveur
const corsOptions = {
  origin: function (origin, callback) {
    // Autorise les requêtes sans origine (WebView mobile, Postman, etc.)
    // et les origines déclarées dans le fichier config
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

// Parsing du corps des requêtes HTTP
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route de test d'état du serveur (Healthcheck)
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API Monan Service opérationnelle' });
});

// Vos routes d'API (à décommenter ou importer selon vos fichiers de routes)
// const clientRoutes = require('./routes/clientRoutes');
// const depotRoutes = require('./routes/depotRoutes');
// app.use('/api/clients', clientRoutes);
// app.use('/api/depots', depotRoutes);

// Gestionnaire global d'erreurs
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