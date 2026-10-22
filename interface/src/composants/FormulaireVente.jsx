import { useState, useEffect } from 'react';

export default function FormulaireVente({ fermerTiroir, depotId, clients = [], actualiserAccueil, prixUnitaire = 2000 }) {
  const [clientId, setClientId] = useState('');
  const [qty, setQty] = useState(1);
  const [empty, setEmpty] = useState(1);
  const [montantPaye, setMontantPaye] = useState(prixUnitaire);
  const [enChargement, setEnChargement] = useState(false);

  const total = qty * prixUnitaire;
  const dette = Math.max(0, total - montantPaye);

  useEffect(() => {
    setMontantPaye(qty * prixUnitaire);
  }, [qty, prixUnitaire]);

  const validerVente = async () => {
    if (!depotId) return alert("Aucun dépôt sélectionné !");
    setEnChargement(true);

    const donneesVente = {
      type_operation: 'vente',
      quantite_pleine: qty,
      quantite_vide: empty,
      montant_total: total,
      montant_paye: montantPaye,
      reste_a_payer: dette,
      depot_id: depotId,
      client_id: clientId || null
    };

    try {
      const reponse = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donneesVente)
      });

      if (reponse.ok) {
        actualiserAccueil();
        fermerTiroir();
        alert('✅ Vente enregistrée avec succès !');
      } else {
        alert('❌ Erreur lors de l\'enregistrement.');
      }
    } catch (erreur) {
      console.error(erreur);
      alert('❌ Impossible de contacter le serveur.');
    } finally {
      setEnChargement(false);
    }
  };

  return (
    <>
      <h2>Nouvelle vente</h2>

      <label>Sélectionner le client</label>
      <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
        <option value="">Client de passage</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.nom} {c.telephone ? `(${c.telephone})` : ''}</option>
        ))}
      </select>

      <label>Bouteilles vendues</label>
      <div className="stepper">
        <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
        <input type="number" value={qty} readOnly />
        <button onClick={() => setQty(qty + 1)}>+</button>
      </div>

      <label>Bouteilles vides rendues par le client</label>
      <div className="stepper">
        <button onClick={() => setEmpty(Math.max(0, empty - 1))}>−</button>
        <input type="number" value={empty} readOnly />
        <button onClick={() => setEmpty(empty + 1)}>+</button>
      </div>

      <div className="totalbox">
        <span>À payer</span><b>{total.toLocaleString('fr-FR')} F</b>
      </div>

      <label>Montant reçu (F)</label>
      <input type="number" value={montantPaye} onChange={(e) => setMontantPaye(Number(e.target.value))} />

      {dette > 0 && <p className="muted">Reste à payer : {dette} F</p>}

      <div className="btns">
        <button className="btn ghost" onClick={fermerTiroir}>Annuler</button>
        <button className="btn flame" onClick={validerVente} disabled={enChargement}>
          {enChargement ? 'Enregistrement...' : 'Valider la vente'}
        </button>
      </div>
    </>
  );
}