import React, { useState, useEffect } from 'react';
import { API_URL } from '../config'; // <--- 1. IMPORTATION DE L'URL CENTRALISÉE

const VueAccueil = () => {
  const [donneesAccueil, setDonneesAccueil] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    chargerDonneesDashboard();
  }, []);

  const chargerDonneesDashboard = async () => {
    try {
      const jeton = localStorage.getItem('jeton_monan');

      // <--- 2. UTILISATION DE ${API_URL} AU LIEU DE http://localhost:5000
      const reponse = await fetch(`${API_URL}/api/depots`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jeton}`
        }
      });

      if (!reponse.ok) {
        throw new Error('Erreur lors du chargement des données');
      }

      const donnes = await reponse.json();
      setDonneesAccueil(donnes);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  if (chargement) {
    return <div className="chargement">Chargement du tableau de bord...</div>;
  }

  if (erreur) {
    return <div className="message-erreur">{erreur}</div>;
  }

  return (
    <div className="vue-accueil">
      <h1>Tableau de Bord - Monan Service Pro</h1>
      
      <div className="grille-statistiques">
        <div className="carte-stat">
          <h3>Dépôts actifs</h3>
          <p>{donneesAccueil ? donneesAccueil.length : 0}</p>
        </div>
      </div>
    </div>
  );
};

export default VueAccueil;