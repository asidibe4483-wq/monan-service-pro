import React, { useState } from 'react';
import { API_URL } from '../config';

const VueClientRecherche = () => {
  const [motCle, setMotCle] = useState('');
  const [resultats, setResultats] = useState([]);

  const chercher = async () => {
    try {
      const jeton = localStorage.getItem('jeton_monan');
      const res = await fetch(`${API_URL}/api/clients/recherche?q=${motCle}`, {
        headers: { 'Authorization': `Bearer ${jeton}` }
      });
      const data = await res.json();
      setResultats(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="vue">
      <h2>Recherche Rapide Client</h2>
      <input type="text" placeholder="Numéro ou Nom..." value={motCle} onChange={(e) => setMotCle(e.target.value)} />
      <button onClick={chercher}>Chercher</button>
      <div>
        {resultats.map(r => (
          <div key={r.id} className="carte-client">
            <h4>{r.nom}</h4>
            <p>Dette: {r.dette_actuelle} FCFA</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VueClientRecherche;