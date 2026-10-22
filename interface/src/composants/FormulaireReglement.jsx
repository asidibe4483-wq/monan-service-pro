import { useState } from 'react';

export default function FormulaireReglement({ client, fermerTiroir, actualiserDonnees, depotId }) {
  const [montant, setMontant] = useState(client ? parseFloat(client.dette_actuelle || 0) : 0);
  const [enChargement, setEnChargement] = useState(false);

  const validerReglement = async (e) => {
    e.preventDefault();
    if (!client) return alert("Aucun client sélectionné.");
    if (montant <= 0) return alert("Veuillez saisir un montant valide.");

    setEnChargement(true);
    try {
      const reponse = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_operation: 'reglement_dette',
          quantite_pleine: 0,
          quantite_vide: 0,
          montant_total: montant,
          montant_paye: montant,
          reste_a_payer: 0,
          depot_id: depotId,
          client_id: client.id
        })
      });

      if (reponse.ok) {
        actualiserDonnees();
        fermerTiroir();
        alert('✅ Règlement enregistré avec succès !');
      } else {
        alert('❌ Erreur lors du règlement.');
      }
    } catch (erreur) {
      console.error(erreur);
      alert('❌ Erreur de connexion au serveur.');
    } finally {
      setEnChargement(false);
    }
  };

  return (
    <form onSubmit={validerReglement}>
      <h2>Règlement de dette</h2>
      <p className="muted" style={{ marginBottom: '4px' }}>Client : <b>{client?.nom}</b></p>
      <p className="muted" style={{ marginBottom: '16px' }}>
        Dette actuelle : <b className="neg">{parseFloat(client?.dette_actuelle || 0).toLocaleString('fr-FR')} F</b>
      </p>

      <label>Montant remboursé (F) *</label>
      <input
        type="number"
        value={montant}
        onChange={(e) => setMontant(Number(e.target.value))}
        min="1"
        max={client?.dette_actuelle}
        required
      />

      <div className="btns">
        <button type="button" className="btn ghost" onClick={fermerTiroir}>Annuler</button>
        <button type="submit" className="btn flame" disabled={enChargement}>
          {enChargement ? 'Enregistrement...' : 'Valider le règlement'}
        </button>
      </div>
    </form>
  );
}