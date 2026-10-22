export default function VuePlus({ depot, clients = [], transactions = [], utilisateur, onDeconnexion }) {
  const totalOp = transactions.length;
  const totalClients = clients.length;

  return (
    <>
      <h2>Plus & Paramètres</h2>

      {/* Compte Utilisateur */}
      <div className="card" style={{ marginBottom: '16px', background: '#F8F9FA' }}>
        <div className="muted">Compte actif</div>
        <div style={{ fontWeight: 800, fontSize: '18px', marginTop: '4px' }}>
          👤 {utilisateur?.nom || 'Utilisateur'}
        </div>
        <div className="muted" style={{ fontSize: '13px', marginTop: '2px' }}>
          Rôle : {utilisateur?.role === 'gerant' ? 'Gérant' : 'Employé'} {utilisateur?.email ? `— ${utilisateur.email}` : ''}
        </div>
        {onDeconnexion && (
          <button 
            className="btn sm" 
            onClick={onDeconnexion}
            style={{ marginTop: '12px', background: '#FFE8E8', color: 'var(--red)', border: 'none' }}
          >
            Déconnexion
          </button>
        )}
      </div>

      {/* Information du Dépôt */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="muted">Dépôt attribué</div>
        <div style={{ fontWeight: 800, fontSize: '18px', marginTop: '4px' }}>
          {depot ? depot.nom : 'Chargement...'}
        </div>
        <div className="muted" style={{ fontSize: '13px', marginTop: '2px' }}>
          {depot?.localisation || 'Localisation non définie'}
        </div>
      </div>

      <h3>Statistiques globales</h3>
      <div className="list" style={{ marginBottom: '20px' }}>
        <div className="item">
          <div className="grow">
            <div style={{ fontWeight: 700 }}>Prix unitaire par défaut</div>
            <div className="muted" style={{ fontSize: '13px' }}>Prix de la bouteille pleine</div>
          </div>
          <div className="amt">2 000 F</div>
        </div>

        <div className="item">
          <div className="grow">
            <div style={{ fontWeight: 700 }}>Base clients</div>
            <div className="muted" style={{ fontSize: '13px' }}>Nombre de clients enregistrés</div>
          </div>
          <div className="amt">{totalClients}</div>
        </div>

        <div className="item">
          <div className="grow">
            <div style={{ fontWeight: 700 }}>Total opérations</div>
            <div className="muted" style={{ fontSize: '13px' }}>Historique cumulé en BDD</div>
          </div>
          <div className="amt">{totalOp}</div>
        </div>
      </div>

      <h3>Informations Système</h3>
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: '16px' }}>Monan Service Pro</div>
        <div className="muted" style={{ fontSize: '13px', marginTop: '4px' }}>
          Version 1.0.0 — Application de gestion de dépôts de gaz
        </div>
        <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
          Architecture : React (Vite) • Node.js (Express) • PostgreSQL
        </div>
      </div>
    </>
  );
}