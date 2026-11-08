import React, { useState } from 'react';
import { API_URL } from '../config';

const FormulaireDepense = ({ depotId, onSucces }) => {
  const [montant, setMontant] = useState(0);
  const [description, setDescription] = useState('');
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
          type_operation: 'depense',
          montant_total: parseFloat(montant),
          description,
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
      <h3>Saisir une Dépense</h3>
      <input type="number" placeholder="Montant (FCFA)" value={montant} onChange={(e) => setMontant(e.target.value)} required />
      <input type="text" placeholder="Motif (ex: Carburant, transport...)" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <button type="submit" disabled={chargement}>{chargement ? 'Enregistrement...' : 'Valider Dépense'}</button>
    </form>
  );
};

export default FormulaireDepense;