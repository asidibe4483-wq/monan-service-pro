import { useState } from 'react';

export default function FormulaireDepense({ fermerTiroir, depotId, actualiserDonnees }) {
  const [motif, setMotif] = useState('');
  const [montant, setMontant] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  const validerDepense = async (e) => {
    e.preventDefault();
    const montantNum = parseFloat(montant);
    if (!montantNum || montantNum <= 0) {
      return alert("Veuillez saisir un montant valide.");
    }
    if (!motif.trim()) {
      return alert("Veuillez préciser le motif de la dépense.");
    }

    setEnChargement(true);
    try {
      const reponse = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_operation: 'depense',
          quantite_pleine: 0,
          quantite_vide: 0,
          montant_total: montantNum,
          montant_paye: montantNum,
          reste_a_payer: 0,
          depot_id: depotId,
          description: motif.trim()
        })
      });

      if (reponse.ok) {
        actualiserDonnees();
        fermerTiroir();
        alert('✅ Dépense enregistrée avec succès !');
      } else {
        alert('❌ Erreur lors de l\'enregistrement de la dépense.');
      }
    } catch (erreur) {
      console.error(erreur);
      alert('❌ Erreur de connexion au serveur.');
    } finally {
      setEnChargement(false);
    }
  };

  return (
    <form onSubmit={validerDepense}>
      <h2>Enregistrer une Dépense</h2>
      <p className="muted" style={{ marginBottom: '16px' }}>
        Enregistrez les sorties d'espèces du tiroir-caisse avec leur motif.
      </p>

      <label>Motif / Libellé de la dépense *</label>
      <input
        type="text"
        placeholder="Ex: Transport camion, Repas, Électricité..."
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        required
      />

      <label>Montant de la dépense (F) *</label>
      <input
        type="number"
        placeholder="Ex: 5000"
        value={montant}
        onChange={(e) => setMontant(e.target.value)}
        min="1"
        required
      />

      <div className="btns" style={{ marginTop: '20px' }}>
        <button type="button" className="btn ghost" onClick={fermerTiroir}>Annuler</button>
        <button type="submit" className="btn flame" disabled={enChargement}>
          {enChargement ? 'Enregistrement...' : 'Valider la dépense'}
        </button>
      </div>
    </form>
  );
}