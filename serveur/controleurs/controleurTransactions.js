const bdd = require('../base_de_donnees');

// Lire uniquement les transactions du dépôt de l'utilisateur connecté
const lireTransactions = async (req, res) => {
    const depotId = req.utilisateur?.depot_id;

    if (!depotId) {
        return res.status(400).json({ erreur: 'Aucun dépôt associé à cette session.' });
    }

    try {
        const resultat = await bdd.query(
            'SELECT * FROM transactions WHERE depot_id = $1 ORDER BY date_operation DESC',
            [depotId]
        );
        res.json(resultat.rows);
    } catch (erreur) {
        console.error('Erreur lecture transactions:', erreur.message);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des transactions.' });
    }
};

// Ajouter une transaction pour le dépôt actif
const ajouterTransaction = async (req, res) => {
    const depotId = req.utilisateur?.depot_id || req.body.depot_id;
    const { 
        type_operation, 
        quantite_pleine, 
        quantite_vide, 
        montant_total, 
        montant_paye, 
        reste_a_payer, 
        client_id,
        description 
    } = req.body;

    if (!depotId) {
        return res.status(400).json({ erreur: 'Identifiant du dépôt manquant.' });
    }

    try {
        await bdd.query('BEGIN');

        // 1. Enregistrement de la transaction
        const resultatTx = await bdd.query(
            `INSERT INTO transactions 
            (type_operation, quantite_pleine, quantite_vide, montant_total, montant_paye, reste_a_payer, depot_id, client_id, description) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                type_operation, 
                quantite_pleine || 0, 
                quantite_vide || 0, 
                montant_total || 0, 
                montant_paye || 0, 
                reste_a_payer || 0, 
                depotId, 
                client_id || null,
                description || null
            ]
        );

        // 2. Mise à jour des stocks et des créances selon le type
        if (type_operation === 'vente') {
            await bdd.query(
                `UPDATE depots 
                 SET stock_plein = stock_plein - $1, 
                     stock_vide = stock_vide + $2 
                 WHERE id = $3`,
                [quantite_pleine || 0, quantite_vide || 0, depotId]
            );

            if (client_id) {
                await bdd.query(
                    `UPDATE clients 
                     SET dette_actuelle = dette_actuelle + $1,
                         total_bouteilles_achetees = total_bouteilles_achetees + $2
                     WHERE id = $3`,
                    [reste_a_payer || 0, quantite_pleine || 0, client_id]
                );
            }
        } else if (type_operation === 'approvisionnement') {
            await bdd.query(
                `UPDATE depots 
                 SET stock_plein = stock_plein + $1, 
                     stock_vide = stock_vide - $2 
                 WHERE id = $3`,
                [quantite_pleine || 0, quantite_vide || 0, depotId]
            );
        } else if (type_operation === 'reglement_dette') {
            if (client_id) {
                await bdd.query(
                    `UPDATE clients 
                     SET dette_actuelle = GREATEST(0, dette_actuelle - $1) 
                     WHERE id = $2`,
                    [montant_paye || 0, client_id]
                );
            }
        } else if (type_operation === 'ajustement') {
            await bdd.query(
                `UPDATE depots 
                 SET stock_plein = GREATEST(0, stock_plein + $1), 
                     stock_vide = GREATEST(0, stock_vide + $2) 
                 WHERE id = $3`,
                [quantite_pleine || 0, quantite_vide || 0, depotId]
            );
        }
        // 'depense' n'impacte pas les stocks, la ligne est juste insérée dans 'transactions'

        await bdd.query('COMMIT');
        res.status(201).json(resultatTx.rows[0]);
    } catch (erreur) {
        await bdd.query('ROLLBACK');
        console.error('Erreur transaction:', erreur.message);
        res.status(500).json({ erreur: 'Erreur serveur lors du traitement de la transaction.' });
    }
};

module.exports = { lireTransactions, ajouterTransaction };