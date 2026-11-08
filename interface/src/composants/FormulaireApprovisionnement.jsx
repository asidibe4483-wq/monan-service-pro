import React, { useState } from 'react';
import { API_URL } from '../config';

const FormulaireApprovisionnement = ({ depotId, onSucces }) => {
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
          type_operation: 'approvisionnement',
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
      <h3>Approvisionnement Dépôt</h3>
      <input type="number" placeholder="Bouteilles pleines reçues" value={quantitePleine} onChange={(e) => setQuantitePleine(e.target.value)} required />
      <input type="number" placeholder="Bouteilles vides rendues" value={quantiteVide} onChange={(e) => setQuantiteVide(e.target.value)} required />
      <textarea placeholder="Remarques / Camion..." value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="submit" disabled={chargement}>{chargement ? 'Enregistrement...' : 'Valider l\'approvisionnement'}</button>
    </form>
  );
};

export default FormulaireApprovisionnement;