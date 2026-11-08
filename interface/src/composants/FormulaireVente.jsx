import React, { useState } from 'react';
import { API_URL } from '../config';

const FormulaireVente = ({ depotId, clients, onSucces }) => {
  const [clientId, setClientId] = useState('');
  const [quantitePleine, setQuantitePleine] = useState(1);
  const [quantiteVide, setQuantiteVide] = useState(1);
  const [montantTotal, setMontantTotal] = useState(0);
  const [montantPaye, setMontantPaye] = useState(0);
  const [chargement, setChargement] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    setChargement(true);
    try {
      const jeton = localStorage.getItem('jeton_monan');
      const reste = montantTotal - montantPaye;
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jeton}`
        },
        body: JSON.stringify({
          type_operation: 'vente',
          quantite_pleine: parseInt(quantitePleine),
          quantite_vide: parseInt(quantiteVide),
          montant_total: parseFloat(montantTotal),
          montant_paye: parseFloat(montantPaye),
          reste_a_payer: reste,
          client_id: clientId || null,
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
      <h3>Enregistrer une Vente</h3>
      <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
        <option value="">-- Client de passage --</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
      </select>
      <input type="number" placeholder="Bouteilles pleines vendant" value={quantitePleine} onChange={(e) => setQuantitePleine(e.target.value)} required />
      <input type="number" placeholder="Bouteilles vides récupérées" value={quantiteVide} onChange={(e) => setQuantiteVide(e.target.value)} required />
      <input type="number" placeholder="Montant Total (FCFA)" value={montantTotal} onChange={(e) => setMontantTotal(e.target.value)} required />
      <input type="number" placeholder="Montant Payé (FCFA)" value={montantPaye} onChange={(e) => setMontantPaye(e.target.value)} required />
      <button type="submit" disabled={chargement}>{chargement ? 'Validation...' : 'Valider la Vente'}</button>
    </form>
  );
};

export default FormulaireVente;