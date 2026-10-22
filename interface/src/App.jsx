import { useState, useEffect } from 'react';
import './index.css';
import Navigation from './composants/Navigation';
import VueAccueil from './vues/VueAccueil';
import VueClients from './vues/VueClients';
import VueStock from './vues/VueStock';
import VueCaisse from './vues/VueCaisse';
import VuePlus from './vues/VuePlus';
import VueClientRecherche from './vues/VueClientRecherche';
import FenetreTiroir from './composants/FenetreTiroir';
import FormulaireVente from './composants/FormulaireVente';
import FormulaireApprovisionnement from './composants/FormulaireApprovisionnement';
import FormulaireClient from './composants/FormulaireClient';
import FormulaireReglement from './composants/FormulaireReglement';
import FormulaireAjustement from './composants/FormulaireAjustement';
import FormulaireDepense from './composants/FormulaireDepense';
import EcranConnexion from './composants/EcranConnexion';

function App() {
  const [utilisateur, setUtilisateur] = useState(() => {
    const u = localStorage.getItem('utilisateur');
    return u ? JSON.parse(u) : null;
  });

  const [depot, setDepot] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientA_Regler, setClientA_Regler] = useState(null);
  const [ongletActif, setOngletActif] = useState('home');
  const [fenetreActive, setFenetreActive] = useState(null);

  const chargerDonnees = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    };

    try {
      const resDepots = await fetch('http://localhost:5000/api/depots', { headers });
      const donneesDepots = await resDepots.json();
      if (Array.isArray(donneesDepots) && donneesDepots.length > 0) {
        setDepot(donneesDepots[0]);
      }

      const resTx = await fetch('http://localhost:5000/api/transactions', { headers });
      const donneesTx = await resTx.json();
      setTransactions(Array.isArray(donneesTx) ? donneesTx : []);

      const resClients = await fetch('http://localhost:5000/api/clients', { headers });
      const donneesClients = await resClients.json();
      setClients(Array.isArray(donneesClients) ? donneesClients : []);
    } catch (err) {
      console.error("Erreur de chargement :", err);
    }
  };

  useEffect(() => {
    if (utilisateur && utilisateur.type_compte === 'vendeur') {
      chargerDonnees();
    }
  }, [utilisateur]);

  const deconnexion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    setUtilisateur(null);
    setDepot(null);
    setTransactions([]);
    setClients([]);
  };

  const ouvrirReglement = (client) => {
    setClientA_Regler(client);
    setFenetreActive('reglement');
  };

  if (!utilisateur) {
    return <EcranConnexion onConnexionReussie={(user) => setUtilisateur(user)} />;
  }

  // SI L'UTILISATEUR EST UN CLIENT MÉNAGER : AFFICHER LA VUE DE RECHERCHE DE GAZ
  if (utilisateur.type_compte === 'client') {
    return <VueClientRecherche utilisateur={utilisateur} onDeconnexion={deconnexion} />;
  }

  // SINON (COMPTE VENDEUR) : AFFICHER L'ESPACE DE GESTION DE DÉPÔT
  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 120 120" aria-label="Logo Monan service" style={{ width: '32px', height: '32px' }}>
            <use href="#logo" />
          </svg>
          <div className="brand">
            Monan service
            <small>{depot ? depot.nom : 'Chargement...'}</small>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="depotchip" style={{ fontSize: '12px', background: 'var(--smoke)' }}>
            👤 {utilisateur.nom}
          </span>
          <button 
            onClick={deconnexion}
            style={{
              background: '#FFE8E8', color: 'var(--red)', border: 'none',
              borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main id="view">
        {ongletActif === 'home' && (
          <VueAccueil depot={depot} transactions={transactions} clients={clients} onOuvrirAppro={() => setFenetreActive('appro')} />
        )}
        {ongletActif === 'stock' && (
          <VueStock depot={depot} transactions={transactions} onOuvrirAjustement={() => setFenetreActive('ajustement')} utilisateur={utilisateur} />
        )}
        {ongletActif === 'clients' && (
          <VueClients clients={clients} onOuvrirAjoutClient={() => setFenetreActive('client')} onOuvrirReglement={ouvrirReglement} />
        )}
        {ongletActif === 'cash' && (
          <VueCaisse transactions={transactions} onOuvrirDepense={() => setFenetreActive('depense')} utilisateur={utilisateur} />
        )}
        {ongletActif === 'more' && (
          <VuePlus depot={depot} clients={clients} transactions={transactions} utilisateur={utilisateur} onDeconnexion={deconnexion} />
        )}
      </main>

      <button className="fab" onClick={() => setFenetreActive('vente')}>
        + Vendre
      </button>

      <Navigation ongletActif={ongletActif} changerOnglet={setOngletActif} />

      <FenetreTiroir isOpen={fenetreActive !== null} fermerTiroir={() => setFenetreActive(null)}>
        {fenetreActive === 'vente' && <FormulaireVente fermerTiroir={() => setFenetreActive(null)} depotId={depot?.id} clients={clients} actualiserAccueil={chargerDonnees} />}
        {fenetreActive === 'appro' && <FormulaireApprovisionnement fermerTiroir={() => setFenetreActive(null)} depotId={depot?.id} actualiserAccueil={chargerDonnees} />}
        {fenetreActive === 'client' && <FormulaireClient fermerTiroir={() => setFenetreActive(null)} actualiserClients={chargerDonnees} />}
        {fenetreActive === 'reglement' && <FormulaireReglement client={clientA_Regler} fermerTiroir={() => setFenetreActive(null)} actualiserDonnees={chargerDonnees} depotId={depot?.id} />}
        {fenetreActive === 'ajustement' && <FormulaireAjustement fermerTiroir={() => setFenetreActive(null)} actualiserDonnees={chargerDonnees} depotId={depot?.id} depot={depot} />}
        {fenetreActive === 'depense' && <FormulaireDepense fermerTiroir={() => setFenetreActive(null)} actualiserDonnees={chargerDonnees} depotId={depot?.id} />}
      </FenetreTiroir>
    </>
  );
}

export default App;