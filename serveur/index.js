const express = require('express');
const cors = require('cors');
const bdd = require('./base_de_donnees');

// Importation des contrôleurs
const { lireTransactions, ajouterTransaction } = require('./controleurs/controleurTransactions');
const { connexion, inscription, initialiserGerant } = require('./controleurs/controleurAuth');
const { rechercherDepotsProches } = require('./controleurs/controleurClients');
const { verifierJeton } = require('./middlewareAuth');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ==========================================
// ROUTES PUBLIQUES CLIENTS
// ==========================================
app.get('/api/client/depots-proches', rechercherDepotsProches);

// ==========================================
// ROUTES AUTHENTIFICATION
// ==========================================
app.post('/api/auth/connexion', connexion);
app.post('/api/auth/inscription', inscription);
app.post('/api/auth/initialiser', initialiserGerant);

// ==========================================
// ROUTES SÉCURISÉES DÉPÔTS & SECTEUR VENDEURS
// ==========================================
app.get('/api/depots', verifierJeton, async (req, res) => {
    try {
        const resDb = await bdd.query('SELECT * FROM depots WHERE id = $1', [req.utilisateur.depot_id]);
        res.json(resDb.rows);
    } catch (erreur) {
        console.error('Erreur lecture dépôt:', erreur.message);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des données.' });
    }
});

app.get('/api/transactions', verifierJeton, lireTransactions);
app.post('/api/transactions', verifierJeton, ajouterTransaction);

app.get('/api/clients', verifierJeton, async (req, res) => {
    try {
        const resDb = await bdd.query('SELECT * FROM clients WHERE depot_id = $1 ORDER BY nom ASC', [req.utilisateur.depot_id]);
        res.json(resDb.rows);
    } catch (erreur) {
        console.error('Erreur lecture clients:', erreur.message);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des clients.' });
    }
});

app.post('/api/clients', verifierJeton, async (req, res) => {
    const { nom, telephone } = req.body;
    try {
        const resDb = await bdd.query(
            'INSERT INTO clients (nom, telephone, depot_id) VALUES ($1, $2, $3) RETURNING *',
            [nom, telephone, req.utilisateur.depot_id]
        );
        res.status(201).json(resDb.rows[0]);
    } catch (erreur) {
        console.error('Erreur ajout client:', erreur.message);
        res.status(500).json({ erreur: 'Erreur lors de la création du client.' });
    }
});

// DÉMARRAGE SERVEUR
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur Monan Service Pro démarré sur http://localhost:${PORT}`);
});