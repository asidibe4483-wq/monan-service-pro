const bdd = require('../base_de_donnees');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'monan_service_secret_key_securisee';

// Inscription : Vendeur (avec création de dépôt) ou Client ménager
const inscription = async (req, res) => {
    const { nom_depot, nom, email, mot_de_passe, telephone, type_compte = 'vendeur' } = req.body;

    if (!nom || !email || !mot_de_passe) {
        return res.status(400).json({ erreur: 'Veuillez remplir tous les champs obligatoires.' });
    }

    try {
        // Vérifier si l'email existe déjà
        const verifEmail = await bdd.query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
        if (verifEmail.rows.length > 0) {
            return res.status(400).json({ erreur: 'Cet email est déjà utilisé par un autre compte.' });
        }

        await bdd.query('BEGIN');

        let depotId = null;
        let nouveauDepot = null;

        // Si c'est un vendeur, on crée obligatoirement son dépôt de gaz
        if (type_compte === 'vendeur') {
            if (!nom_depot) {
                await bdd.query('ROLLBACK');
                return res.status(400).json({ erreur: 'Le nom du dépôt est obligatoire pour un vendeur.' });
            }
            const resDepot = await bdd.query(
                'INSERT INTO depots (nom, localisation, stock_plein, stock_vide, telephone) VALUES ($1, $2, 0, 0, $3) RETURNING *',
                [nom_depot, 'Non spécifiée', telephone || null]
            );
            nouveauDepot = resDepot.rows[0];
            depotId = nouveauDepot.id;
        }

        // Hachage sécurisé du mot de passe
        const motDePasseHache = await bcrypt.hash(mot_de_passe, 10);

        // Création de l'utilisateur
        const resUser = await bdd.query(
            `INSERT INTO utilisateurs (nom, email, mot_de_passe, depot_id, type_compte) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, nom, email, depot_id, type_compte`,
            [nom, email, motDePasseHache, depotId, type_compte]
        );
        const nouvelUtilisateur = resUser.rows[0];

        await bdd.query('COMMIT');

        // Génération du jeton JWT
        const token = jwt.sign(
            { 
                id: nouvelUtilisateur.id, 
                nom: nouvelUtilisateur.nom, 
                email: nouvelUtilisateur.email, 
                depot_id: nouvelUtilisateur.depot_id, 
                type_compte: nouvelUtilisateur.type_compte 
            },
            SECRET_KEY,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'Compte créé avec succès !',
            token,
            utilisateur: nouvelUtilisateur,
            depot: nouveauDepot
        });
    } catch (erreur) {
        await bdd.query('ROLLBACK');
        console.error('Erreur inscription:', erreur.message);
        res.status(500).json({ erreur: 'Erreur lors de la création du compte.' });
    }
};

// Connexion utilisateur (Vendeur ou Client)
const connexion = async (req, res) => {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
        return res.status(400).json({ erreur: 'Veuillez saisir votre email et votre mot de passe.' });
    }

    try {
        const resultat = await bdd.query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
        if (resultat.rows.length === 0) {
            return res.status(401).json({ erreur: 'Email ou mot de passe incorrect.' });
        }

        const utilisateur = resultat.rows[0];
        const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);

        if (!motDePasseValide) {
            return res.status(401).json({ erreur: 'Email ou mot de passe incorrect.' });
        }

        const token = jwt.sign(
            { 
                id: utilisateur.id, 
                nom: utilisateur.nom, 
                email: utilisateur.email, 
                depot_id: utilisateur.depot_id, 
                type_compte: utilisateur.type_compte || 'vendeur' 
            },
            SECRET_KEY,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            utilisateur: {
                id: utilisateur.id,
                nom: utilisateur.nom,
                email: utilisateur.email,
                depot_id: utilisateur.depot_id,
                type_compte: utilisateur.type_compte || 'vendeur'
            }
        });
    } catch (erreur) {
        console.error('Erreur connexion:', erreur.message);
        res.status(500).json({ erreur: 'Erreur serveur lors de la connexion.' });
    }
};

// Initialisation d'un compte Démo (Vendeur de test)
const initialiserGerant = async (req, res) => {
    try {
        const existe = await bdd.query('SELECT * FROM utilisateurs WHERE email = $1', ['demo@monan.com']);
        if (existe.rows.length > 0) {
            return res.json({ message: 'Le compte démo existe déjà.' });
        }

        await bdd.query('BEGIN');

        const resDepot = await bdd.query(
            'INSERT INTO depots (nom, localisation, stock_plein, stock_vide, telephone) VALUES ($1, $2, 20, 10, $3) RETURNING id',
            ['Dépôt Démo Bouaké', 'Bouaké Centre', '0700000000']
        );

        const motDePasseHache = await bcrypt.hash('demo123', 10);
        const resultat = await bdd.query(
            `INSERT INTO utilisateurs (nom, email, mot_de_passe, depot_id, type_compte) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, nom, email, depot_id, type_compte`,
            ['Vendeur Démo', 'demo@monan.com', motDePasseHache, resDepot.rows[0].id, 'vendeur']
        );

        await bdd.query('COMMIT');

        res.status(201).json({ message: 'Compte Démo créé !', utilisateur: resultat.rows[0] });
    } catch (erreur) {
        await bdd.query('ROLLBACK');
        console.error('Erreur initialisation démo:', erreur.message);
        res.status(500).json({ erreur: 'Erreur lors de la création du compte démo.' });
    }
};

module.exports = { inscription, connexion, initialiserGerant };