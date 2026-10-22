import { useState } from 'react';

export default function FormulaireApprovisionnement({ fermerTiroir, depotId, actualiserAccueil }) {
  const [qtyPleine, setQtyPleine] = useState(10);
  const [qtyVide, setQtyVide] = useState(10);
  const [montantPaye, setMontantPaye] = useState(0);
  const [enChargement, setEnChargement] = useState(false);

  const validerAppro = async () => {
    if (!depotId) return alert("Aucun dépôt sélectionné !");
    setEnChargement(true);

    const donneesAppro = {
      type_operation: 'approvisionnement',
      quantite_pleine: qtyPleine,
      quantite_vide: qtyVide,
      montant_total: montantPaye,
      montant_paye: montantPaye,
      reste_a_payer: 0,
      depot_id: depotId
    };

    try {
      const reponse = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donneesAppro)
      });

      if (reponse.ok) {
        actualiserAccueil();
        fermerTiroir();
        alert('✅ Approvisionnement enregistré !');
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
      <h2>Approvisionnement</h2>
      
      <label>Bouteilles pleines reçues</label>
      <div className="stepper">
        <button type="button" onClick={() => setQtyPleine(Math.max(0, qtyPleine - 1))}>−</button>
        <input type="number" value={qtyPleine} readOnly />
        <button type="button" onClick={() => setQtyPleine(qtyPleine + 1)}>+</button>
      </div>

      <label>Bouteilles vides rendues au camion</label>
      <div className="stepper">
        <button type="button" onClick={() => setQtyVide(Math.max(0, qtyVide - 1))}>−</button>
        <input type="number" value={qtyVide} readOnly />
        <button type="button" onClick={() => setQtyVide(qtyVide + 1)}>+</button>
      </div>

      <label>Coût de l'approvisionnement (F)</label>
      <input 
        type="number" 
        value={montantPaye} 
        onChange={(e) => setMontantPaye(Number(e.target.value))} 
        placeholder="Montant payé au fournisseur"
      />

      <div className="btns">
        <button type="button" className="btn ghost" onClick={fermerTiroir}>Annuler</button>
        <button type="button" className="btn flame" onClick={validerAppro} disabled={enChargement}>
          {enChargement ? 'Enregistrement...' : 'Valider l\'opération'}
        </button>
      </div>
    </>
  );
}