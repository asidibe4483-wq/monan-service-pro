// On importe la connexion à la base de données
const bdd = require('../base_de_donnees');

// Fonction pour récupérer (lire) tous les dépôts
const lireDepots = async (req, res) => {
    try {
        // On demande à PostgreSQL de nous donner tous les dépôts, triés par ID
        const resultat = await bdd.query('SELECT * FROM depots ORDER BY id ASC');
        
        // On renvoie le résultat sous forme de données JSON à celui qui a fait la demande
        res.json(resultat.rows);
    } catch (erreur) {
        console.error('Erreur lors de la lecture des dépôts:', erreur.message);
        res.status(500).json({ erreur: 'Erreur interne du serveur' });
    }
};

// On exporte la fonction pour pouvoir l'utiliser dans nos routes
module.exports = {
    lireDepots
};