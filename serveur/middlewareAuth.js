const jwt = require('jsonwebtoken');

const getSecretKey = () => process.env.JWT_SECRET || 'monan_service_secret_key_securisee';

/**
 * Middleware : Vérifie la validité du Token JWT
 */
const verifierJeton = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ erreur: 'Accès refusé. Jeton d\'authentification manquant.' });
    }

    try {
        const utilisateurDecode = jwt.verify(token, getSecretKey());
        req.utilisateur = utilisateurDecode; // Contient id, email, depot_id, type_compte/role
        next();
    } catch (erreur) {
        return res.status(403).json({ erreur: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
    }
};

/**
 * Middleware : Vérifie si l'utilisateur possède l'un des rôles autorisés
 */
const verifierRole = (...rolesAutorises) => {
    return (req, res, next) => {
        if (!req.utilisateur) {
            return res.status(401).json({ erreur: 'Non authentifié.' });
        }
        const roleUtilisateur = (req.utilisateur.type_compte || req.utilisateur.role || '').toLowerCase();
        
        const estAutorise = rolesAutorises.some(role => role.toLowerCase() === roleUtilisateur);
        if (!estAutorise) {
            return res.status(403).json({ erreur: 'Accès refusé. Privilèges insuffisants pour cette opération.' });
        }
        next();
    };
};

module.exports = { verifierJeton, verifierRole };