import React, { useState } from 'react';
import { API_URL } from '../config'; // <--- 1. IMPORTATION DE L'URL CENTRALISÉE

const EcranConnexion = ({ onConnexionReussie }) => {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const GérerSoumission = async (e) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    try {
      // <--- 2. UTILISATION DE ${API_URL} AU LIEU DE http://localhost:5000
      const reponse = await fetch(`${API_URL}/api/auth/connexion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, motDePasse }),
      });

      const donnes = await reponse.json();

      if (!reponse.ok) {
        throw new Error(donnes.message || 'Erreur de connexion');
      }

      // Stockage du jeton JWT et notification du parent
      if (donnes.token) {
        localStorage.setItem('jeton_monan', donnes.token);
      }
      
      if (onConnexionReussie) {
        onConnexionReussie(donnes.utilisateur);
      }

    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="conteneur-connexion">
      <h2>Connexion - Monan Service Pro</h2>
      
      {erreur && <div className="message-erreur">{erreur}</div>}

      <form onSubmit={GérerSoumission}>
        <div className="champ-formulaire">
          <label>Email :</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="votre.email@exemple.com"
          />
        </div>

        <div className="champ-formulaire">
          <label>Mot de passe :</label>
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={chargement}>
          {chargement ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
};

export default EcranConnexion;