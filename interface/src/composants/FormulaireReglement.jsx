import React, { useState } from 'react';
import { API_URL } from '../config';

const FormulaireReglement = ({ clientId, depotId, onSucces }) => {
  const [montantPaye, setMontantPaye] = useState(0);
  const [chargement, setChargement] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    setChargement(true);
    try {
      const jeton = localStorage.getItem('jeton_monan');
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jeton}`
        },
        body: JSON.stringify({
          type_operation: 'reglement',
          montant_paye: parseFloat(montantPaye),
          client_id: clientId,
          depot_id: depotId
        })
      });
      if (res.ok && onSucces) onSucces();
    } catch (err) {
      console.error(err);
    } finally {
      setChargement(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="formulaire">
      <h3>Règlement de Dette Client</h3>
      <input type="number" placeholder="Montant versé (FCFA)" value={montantPaye} onChange={(e) => setMontantPaye(e.target.value)} required />
      <button type="submit" disabled={chargement}>{chargement ? 'Traitement...' : 'Enregistrer Règlement'}</button>
    </form>
  );
};

export default FormulaireReglement;