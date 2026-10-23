import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const VueClients = () => {
  const [clients, setClients] = useState([]);
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    chargerClients();
  }, []);

  const chargerClients = async () => {
    try {
      const jeton = localStorage.getItem('jeton_monan');
      const res = await fetch(`${API_URL}/api/clients`, {
        headers: { 'Authorization': `Bearer ${jeton}` }
      });
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error(err);
    }
  };

  const clientsFiltres = clients.filter(c => c.nom.toLowerCase().includes(recherche.toLowerCase()));

  return (
    <div className="vue">
      <h2>Gestion des Clients</h2>
      <input type="text" placeholder="Rechercher un client..." value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      <ul>
        {clientsFiltres.map(c => (
          <li key={c.id}>
            <strong>{c.nom}</strong> - Tel: {c.telephone || 'N/A'} - Dette: {c.dette_actuelle} FCFA
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VueClients;