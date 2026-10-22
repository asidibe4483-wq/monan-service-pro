const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'monan_service_secret_key_securisee';

const verifierJeton = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ erreur: 'Accès refusé. Veuillez vous connecter.' });
    }

    try {
        const utilisateurDecode = jwt.verify(token, SECRET_KEY);
        req.utilisateur = utilisateurDecode; // Contient id, email, depot_id
        next();
    } catch (erreur) {
        return res.status(403).json({ erreur: 'Session expirée ou invalide.' });
    }
};

module.exports = { verifierJeton };