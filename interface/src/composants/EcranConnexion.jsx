import { useState } from 'react';

export default function EcranConnexion({ onConnexionReussie }) {
  const [mode, setMode] = useState('connexion'); 
  const [typeCompte, setTypeCompte] = useState('vendeur'); // 'vendeur' ou 'client'

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [nom, setNom] = useState('');
  const [nomDepot, setNomDepot] = useState('');
  const [telephone, setTelephone] = useState('');

  const [erreur, setErreur] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  const gererSoumission = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnChargement(true);

    const url = mode === 'connexion' 
      ? 'http://localhost:5000/api/auth/connexion' 
      : 'http://localhost:5000/api/auth/inscription';

    const corps = mode === 'connexion'
      ? { email, mot_de_passe: motDePasse }
      : { 
          nom_depot: nomDepot, 
          nom, 
          email, 
          mot_de_passe: motDePasse,
          telephone,
          type_compte: typeCompte
        };

    try {
      const reponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps)
      });

      const donnees = await reponse.json();

      if (reponse.ok) {
        localStorage.setItem('token', donnees.token);
        localStorage.setItem('utilisateur', JSON.stringify(donnees.utilisateur));
        onConnexionReussie(donnees.utilisateur);
      } else {
        setErreur(donnees.erreur || 'Une erreur est survenue.');
      }
    } catch (err) {
      console.error(err);
      setErreur('Impossible de se connecter au serveur backend.');
    } finally {
      setEnChargement(false);
    }
  };

  const chargerCompteDemo = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/initialiser', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Compte démo prêt.');
      setMode('connexion');
      setEmail('demo@monan.com');
      setMotDePasse('demo123');
    } catch (err) {
      alert('Erreur lors de la création du compte démo.');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '400px', margin: '40px auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px 0', color: 'var(--ink)' }}>Monan Service Pro</h2>
        <p className="muted" style={{ margin: 0, fontSize: '13px' }}>
          {mode === 'connexion' ? 'Accès à votre espace' : 'Créer un nouveau compte'}
        </p>
      </div>

      {/* Selecteur Mode (Connexion / Inscription) */}
      <div style={{ display: 'flex', background: '#F1F3F5', padding: '4px', borderRadius: '10px', marginBottom: '16px' }}>
        <button 
          type="button"
          onClick={() => { setMode('connexion'); setErreur(''); }}
          style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: '8px',
            background: mode === 'connexion' ? '#fff' : 'transparent',
            fontWeight: mode === 'connexion' ? '700' : '500', cursor: 'pointer'
          }}
        >
          Se connecter
        </button>
        <button 
          type="button"
          onClick={() => { setMode('inscription'); setErreur(''); }}
          style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: '8px',
            background: mode === 'inscription' ? '#fff' : 'transparent',
            fontWeight: mode === 'inscription' ? '700' : '500', cursor: 'pointer'
          }}
        >
          S'inscrire
        </button>
      </div>

      {/* Choix du type de compte (si Inscription) */}
      {mode === 'inscription' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            type="button"
            onClick={() => setTypeCompte('vendeur')}
            style={{
              flex: 1, padding: '8px', fontSize: '12px', border: '1px solid var(--steel)', borderRadius: '8px',
              background: typeCompte === 'vendeur' ? 'var(--ink)' : '#fff',
              color: typeCompte === 'vendeur' ? '#fff' : 'var(--ink)',
              fontWeight: '600', cursor: 'pointer'
            }}
          >
            🏪 Je suis Vendeur (Dépôt)
          </button>
          <button 
            type="button"
            onClick={() => setTypeCompte('client')}
            style={{
              flex: 1, padding: '8px', fontSize: '12px', border: '1px solid var(--steel)', borderRadius: '8px',
              background: typeCompte === 'client' ? 'var(--ink)' : '#fff',
              color: typeCompte === 'client' ? '#fff' : 'var(--ink)',
              fontWeight: '600', cursor: 'pointer'
            }}
          >
            🔥 J'achète du Gaz (Client)
          </button>
        </div>
      )}

      {erreur && (
        <div style={{ background: '#FFE8E8', color: 'var(--red)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {erreur}
        </div>
      )}

      <form onSubmit={gererSoumission}>
        {mode === 'inscription' && (
          <>
            {typeCompte === 'vendeur' && (
              <>
                <label>Nom du Dépôt de gaz *</label>
                <input type="text" placeholder="Ex: Dépôt Bouaké Central" value={nomDepot} onChange={(e) => setNomDepot(e.target.value)} required />

                <label>Téléphone du dépôt</label>
                <input type="tel" placeholder="Ex: 07 00 00 00 00" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </>
            )}

            <label>Votre Nom complet *</label>
            <input type="text" placeholder="Ex: Marc Yao" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </>
        )}

        <label>Adresse email *</label>
        <input type="email" placeholder="Ex: utilisateur@monan.com" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Mot de passe *</label>
        <input type="password" placeholder="••••••••" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />

        <button type="submit" className="btn flame block" style={{ marginTop: '20px' }} disabled={enChargement}>
          {enChargement ? 'Chargement...' : mode === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>

      {mode === 'connexion' && (
        <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
          <button type="button" className="btn ghost sm" onClick={chargerCompteDemo}>
            ⚡ Tester avec le compte Démo Vendeur
          </button>
        </div>
      )}
    </div>
  );
}