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
app.use(express.json({ limit: '5mb' }));

// ==========================================
// SANTÉ DU SERVEUR (RENDER)
// ==========================================
app.get('/', (req, res) => {
    res.status(200).json({ service: 'Monan Service Pro API', status: 'ok' });
});

// ==========================================
// AUTHENTIFICATION ADMINISTRATEUR (MONAN)
// ==========================================
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body || {};
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@monan.ci').trim().toLowerCase();
    const adminPassword = (process.env.ADMIN_PASSWORD || 'Monan@Admin2026').trim();

    if (
        (email || '').trim().toLowerCase() === adminEmail &&
        (password || '').trim() === adminPassword
    ) {
        return res.status(200).json({ ok: true });
    }

    return res.status(401).json({
        ok: false,
        erreur: 'Identifiants administrateur invalides.'
    });
});

// ==========================================
// SYNCHRONISATION MULTI-APPAREILS (APP MOBILE)
// ==========================================
const ORDER_STATUS_RANK = {
    available: 1,
    accepted: 2,
    in_delivery: 3,
    delivered: 4
};

let memoireSync = { users: [], orders: [] };
let tableSyncInitialisee = false;

async function assurerTableSync() {
    if (tableSyncInitialisee) return;
    await bdd.query(`
        CREATE TABLE IF NOT EXISTS monan_app_sync (
            id INTEGER PRIMARY KEY DEFAULT 1,
            users JSONB NOT NULL DEFAULT '[]'::jsonb,
            orders JSONB NOT NULL DEFAULT '[]'::jsonb,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await bdd.query(`
        INSERT INTO monan_app_sync (id, users, orders)
        VALUES (1, '[]'::jsonb, '[]'::jsonb)
        ON CONFLICT (id) DO NOTHING
    `);
    tableSyncInitialisee = true;
}

function fusionnerUtilisateurs(existants = [], entrants = []) {
    const carte = new Map();
    existants.forEach((u) => {
        if (u && u.email) carte.set(u.email.toLowerCase(), u);
    });

    entrants.forEach((u) => {
        if (!u || !u.email) return;
        const cle = u.email.toLowerCase();
        const precedent = carte.get(cle);
        if (!precedent) {
            carte.set(cle, u);
            return;
        }

        const fusion = { ...precedent, ...u };

        // Conserve la date d'expiration d'abonnement la plus éloignée
        if (precedent.subscriptionExpiresAt && u.subscriptionExpiresAt) {
            const tPrev = new Date(precedent.subscriptionExpiresAt).getTime();
            const tNew = new Date(u.subscriptionExpiresAt).getTime();
            fusion.subscriptionExpiresAt =
                tNew >= tPrev ? u.subscriptionExpiresAt : precedent.subscriptionExpiresAt;
        }

        // Conserve les coordonnées GPS si le client entrant n'en a pas encore
        if (!u.coords && precedent.coords) {
            fusion.coords = precedent.coords;
        }

        carte.set(cle, fusion);
    });

    return Array.from(carte.values());
}

function fusionnerCommandes(existantes = [], entrantes = []) {
    const carte = new Map();
    existantes.forEach((o) => {
        if (o && o.id) carte.set(o.id, o);
    });

    entrantes.forEach((o) => {
        if (!o || !o.id) return;
        const precedente = carte.get(o.id);
        if (!precedente) {
            carte.set(o.id, o);
            return;
        }

        const rangPrec = ORDER_STATUS_RANK[precedente.status] || 0;
        const rangNouv = ORDER_STATUS_RANK[o.status] || 0;

        if (rangNouv >= rangPrec) {
            carte.set(o.id, { ...precedente, ...o });
        } else {
            carte.set(o.id, { ...o, ...precedente });
        }
    });

    return Array.from(carte.values());
}

app.post('/api/sync', async (req, res) => {
    const incomingUsers = Array.isArray(req.body?.users) ? req.body.users : [];
    const incomingOrders = Array.isArray(req.body?.orders) ? req.body.orders : [];

    try {
        await assurerTableSync();
        const resDb = await bdd.query('SELECT users, orders FROM monan_app_sync WHERE id = 1');
        const dbRow = resDb.rows[0] || { users: [], orders: [] };

        const mergedUsers = fusionnerUtilisateurs(dbRow.users || [], incomingUsers);
        const mergedOrders = fusionnerCommandes(dbRow.orders || [], incomingOrders);

        await bdd.query(
            'UPDATE monan_app_sync SET users = $1::jsonb, orders = $2::jsonb, updated_at = NOW() WHERE id = 1',
            [JSON.stringify(mergedUsers), JSON.stringify(mergedOrders)]
        );

        memoireSync = { users: mergedUsers, orders: mergedOrders };
        return res.status(200).json({ users: mergedUsers, orders: mergedOrders });
    } catch (erreur) {
        console.error('Erreur synchronisation PostgreSQL, bascule mémoire:', erreur.message);
        memoireSync = {
            users: fusionnerUtilisateurs(memoireSync.users, incomingUsers),
            orders: fusionnerCommandes(memoireSync.orders, incomingOrders)
        };
        return res.status(200).json(memoireSync);
    }
});

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