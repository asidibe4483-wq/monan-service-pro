import { useState } from 'react';

export default function FormulaireAjustement({ fermerTiroir, depotId, depot, actualiserDonnees }) {
  const [deltaPleine, setDeltaPleine] = useState(0);
  const [deltaVide, setDeltaVide] = useState(0);
  const [enChargement, setEnChargement] = useState(false);

  const stockPleinActuel = depot ? depot.stock_plein : 0;
  const stockVideActuel = depot ? depot.stock_vide : 0;

  const nouveauStockPlein = Math.max(0, stockPleinActuel + deltaPleine);
  const nouveauStockVide = Math.max(0, stockVideActuel + deltaVide);

  const validerAjustement = async (e) => {
    e.preventDefault();
    if (deltaPleine === 0 && deltaVide === 0) {
      return alert("Veuillez modifier au moins une quantité.");
    }

    setEnChargement(true);
    try {
      const reponse = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_operation: 'ajustement',
          quantite_pleine: deltaPleine,
          quantite_vide: deltaVide,
          montant_total: 0,
          montant_paye: 0,
          reste_a_payer: 0,
          depot_id: depotId
        })
      });

      if (reponse.ok) {
        actualiserDonnees();
        fermerTiroir();
        alert('✅ Ajustement de stock enregistré avec succès !');
      } else {
        alert('❌ Erreur lors de l\'ajustement.');
      }
    } catch (erreur) {
      console.error(erreur);
      alert('❌ Erreur de connexion au serveur.');
    } finally {
      setEnChargement(false);
    }
  };

  const formatDelta = (val) => {
    if (val > 0) return `+${val}`;
    return `${val}`;
  };

  return (
    <form onSubmit={validerAjustement}>
      <h2>Ajustement du Stock</h2>
      <p className="muted" style={{ marginBottom: '16px' }}>
        Indiquez la variation (+ ou −). Le nouveau stock calculé s'affiche en temps réel.
      </p>

      {/* Bouteilles pleines */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ margin: 0 }}>Bouteilles pleines</label>
          <span className="muted" style={{ fontSize: '13px' }}>
            Actuel : <b>{stockPleinActuel}</b> ➔ Nouveau : <b style={{ color: 'var(--flame)' }}>{nouveauStockPlein}</b>
          </span>
        </div>
        <div className="stepper">
          <button type="button" onClick={() => setDeltaPleine(deltaPleine - 1)}>−</button>
          <input type="text" value={formatDelta(deltaPleine)} readOnly />
          <button type="button" onClick={() => setDeltaPleine(deltaPleine + 1)}>+</button>
        </div>
      </div>

      {/* Bouteilles vides */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ margin: 0 }}>Bouteilles vides</label>
          <span className="muted" style={{ fontSize: '13px' }}>
            Actuel : <b>{stockVideActuel}</b> ➔ Nouveau : <b style={{ color: 'var(--ink)' }}>{nouveauStockVide}</b>
          </span>
        </div>
        <div className="stepper">
          <button type="button" onClick={() => setDeltaVide(deltaVide - 1)}>−</button>
          <input type="text" value={formatDelta(deltaVide)} readOnly />
          <button type="button" onClick={() => setDeltaVide(deltaVide + 1)}>+</button>
        </div>
      </div>

      {/* Carte récapitulative */}
      {(deltaPleine !== 0 || deltaVide !== 0) && (
        <div className="card" style={{ background: '#FFF3E8', border: '1px solid var(--flame2)', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>Résumé des modifications :</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            {deltaPleine !== 0 && (
              <div>• Pleines : <b>{formatDelta(deltaPleine)}</b> (Passera de {stockPleinActuel} à {nouveauStockPlein})</div>
            )}
            {deltaVide !== 0 && (
              <div>• Vides : <b>{formatDelta(deltaVide)}</b> (Passera de {stockVideActuel} à {nouveauStockVide})</div>
            )}
          </div>
        </div>
      )}

      <div className="btns">
        <button type="button" className="btn ghost" onClick={fermerTiroir}>Annuler</button>
        <button type="submit" className="btn flame" disabled={enChargement}>
          {enChargement ? 'Enregistrement...' : 'Valider l\'ajustement'}
        </button>
      </div>
    </form>
  );
}