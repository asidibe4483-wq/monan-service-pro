import React, { useState } from 'react';
import { API_URL } from '../config';

const FormulaireAjustement = ({ depotId, onSucces }) => {
  const [quantitePleine, setQuantitePleine] = useState(0);
  const [quantiteVide, setQuantiteVide] = useState(0);
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
          type_operation: 'ajustement',
          quantite_pleine: parseInt(quantitePleine),
          quantite_vide: parseInt(quantiteVide),
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
      <h3>Ajustement de Stock</h3>
      <input type="number" placeholder="Ajustement Pleines (+/-)" value={quantitePleine} onChange={(e) => setQuantitePleine(e.target.value)} required />
      <input type="number" placeholder="Ajustement Vides (+/-)" value={quantiteVide} onChange={(e) => setQuantiteVide(e.target.value)} required />
      <input type="text" placeholder="Raison (ex: Bouteille cassée, fuite...)" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <button type="submit" disabled={chargement}>{chargement ? 'Ajustement...' : 'Appliquer l\'ajustement'}</button>
    </form>
  );
};

export default FormulaireAjustement;