import { useState } from 'react';

export default function FormulaireClient({ fermerTiroir, actualiserClients }) {
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  const validerAjout = async (e) => {
    e.preventDefault();
    if (!nom.trim()) return alert("Veuillez saisir le nom du client.");

    setEnChargement(true);
    try {
      const reponse = await fetch('http://localhost:5000/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, telephone })
      });

      if (reponse.ok) {
        actualiserClients();
        fermerTiroir();
        alert('✅ Client ajouté avec succès !');
      } else {
        alert('❌ Erreur lors de l\'ajout du client.');
      }
    } catch (erreur) {
      console.error(erreur);
      alert('❌ Erreur de connexion au serveur.');
    } finally {
      setEnChargement(false);
    }
  };

  return (
    <form onSubmit={validerAjout}>
      <h2>Nouveau client</h2>

      <label>Nom complet *</label>
      <input
        type="text"
        placeholder="Ex: Kouassi Jean"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        required
      />

      <label>Numéro de téléphone</label>
      <input
        type="tel"
        placeholder="Ex: 07 01 02 03 04"
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
      />

      <div className="btns">
        <button type="button" className="btn ghost" onClick={fermerTiroir}>Annuler</button>
        <button type="submit" className="btn flame" disabled={enChargement}>
          {enChargement ? 'Enregistrement...' : 'Enregistrer le client'}
        </button>
      </div>
    </form>
  );
}