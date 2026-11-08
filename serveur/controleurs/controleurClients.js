const bdd = require('../base_de_donnees');

const rechercherDepotsProches = async (req, res) => {
    const { lat, lng, rayon_km = 10 } = req.query;

    try {
        let requete;
        let parametres = [];

        if (lat && lng) {
            requete = `
                SELECT *, 
                ( 6371 * acos( cos( radians($1) ) * cos( radians( latitude ) ) 
                * cos( radians( longitude ) - radians($2) ) + sin( radians($1) ) 
                * sin( radians( latitude ) ) ) ) AS distance_km
                FROM depots
                WHERE stock_plein > 0
                HAVING ( 6371 * acos( cos( radians($1) ) * cos( radians( latitude ) ) 
                * cos( radians( longitude ) - radians($2) ) + sin( radians($1) ) 
                * sin( radians( latitude ) ) ) ) <= $3
                ORDER BY distance_km ASC;
            `;
            parametres = [parseFloat(lat), parseFloat(lng), parseFloat(rayon_km)];
        } else {
            requete = `SELECT * FROM depots WHERE stock_plein > 0 ORDER BY nom ASC`;
        }

        const resultat = await bdd.query(requete, parametres);

        const depotsDisponibles = resultat.rows.map(depot => ({
            id: depot.id,
            nom: depot.nom,
            localisation: depot.localisation,
            telephone: depot.telephone,
            stock_disponible: depot.stock_plein,
            statut: depot.stock_plein > 5 ? 'En stock' : 'Stock limité',
            distance_km: depot.distance_km ? parseFloat(depot.distance_km).toFixed(1) : null
        }));

        res.json(depotsDisponibles);
    } catch (erreur) {
        console.error('Erreur recherche dépôts:', erreur.message);
        res.status(500).json({ erreur: 'Erreur lors de la recherche des dépôts.' });
    }
};

module.exports = { rechercherDepotsProches };