import React, { useState } from 'react';
import { API_URL } from '../config';

const FormulaireClient = ({ depotId, onSucces }) => {
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [chargement, setChargement] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    setChargement(true);
    try {
      const jeton = localStorage.getItem('jeton_monan');
      const res = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jeton}`
        },
        body: JSON.stringify({ nom, telephone, depot_id: depotId })
      });
      if (res.ok) {
        setNom('');
        setTelephone('');
        if (onSucces) onSucces();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChargement(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="formulaire">
      <h3>Nouveau Client</h3>
      <input type="text" placeholder="Nom du client" value={nom} onChange={(e) => setNom(e.target.value)} required />
      <input type="tel" placeholder="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
      <button type="submit" disabled={chargement}>{chargement ? 'Enregistrement...' : 'Créer Client'}</button>
    </form>
  );
};

export default FormulaireClient;