export default function VueClients({ clients = [], onOuvrirAjoutClient, onOuvrirReglement }) {
  const totalDettes = clients.reduce((sum, c) => sum + parseFloat(c.dette_actuelle || 0), 0);

  return (
    <>
      <h2>Gestion des Clients</h2>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="muted">Total des dettes accumulées</div>
        <div className="big neg" style={{ marginTop: '4px' }}>
          {totalDettes.toLocaleString('fr-FR')} F
        </div>
      </div>

      <div className="btns" style={{ marginBottom: '20px' }}>
        <button className="btn flame block" onClick={onOuvrirAjoutClient}>
          + Nouveau Client
        </button>
      </div>

      <h3>Liste des clients ({clients.length})</h3>

      <div className="list">
        {clients.length === 0 ? (
          <div className="empty-state">
            Aucun client enregistré. Touchez « + Nouveau Client » pour commencer.
          </div>
        ) : (
          clients.map((client) => {
            const dette = parseFloat(client.dette_actuelle || 0);
            return (
              <div className="item" key={client.id}>
                <div className="grow">
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{client.nom}</div>
                  <div className="muted" style={{ fontSize: '13px' }}>
                    {client.telephone ? `📞 ${client.telephone}` : 'Pas de téléphone'}
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div className={`amt ${dette > 0 ? 'neg' : 'pos'}`}>
                    {dette > 0 ? `Dette: ${dette.toLocaleString('fr-FR')} F` : 'À jour'}
                  </div>
                  {dette > 0 && (
                    <button 
                      className="btn sm flame" 
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => onOuvrirReglement(client)}
                    >
                      Régler
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}