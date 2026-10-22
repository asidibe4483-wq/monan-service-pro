export default function VueAccueil({ depot, transactions = [], clients = [], onOuvrirAppro }) {
  if (!depot) return <div className="empty-state">Chargement des données...</div>;

  const bouteillesVendues = transactions
    .filter(tx => tx.type_operation === 'vente')
    .reduce((total, tx) => total + parseInt(tx.quantite_pleine || 0, 10), 0);

  const totalEncaisse = transactions
    .reduce((total, tx) => {
      if (['vente', 'reglement_dette'].includes(tx.type_operation)) {
        return total + parseFloat(tx.montant_paye || 0);
      } else if (['approvisionnement', 'depense'].includes(tx.type_operation)) {
        return total - parseFloat(tx.montant_paye || 0);
      }
      return total;
    }, 0);

  const dettesClients = clients
    .reduce((total, c) => total + parseFloat(c.dette_actuelle || 0), 0);

  return (
    <>
      <h2>Aujourd'hui</h2>
      
      <div className="tiles">
        <div className={`tile full ${depot.stock_plein <= 5 ? 'low' : ''}`}>
          <div className="n">{depot.stock_plein}</div>
          <div className="l">Bouteilles pleines</div>
          <svg viewBox="0 0 40 60"><use href="#bottle"/></svg>
        </div>
        
        <div className="tile empty">
          <div className="n">{depot.stock_vide}</div>
          <div className="l">Bouteilles vides</div>
          <svg viewBox="0 0 40 60" style={{color: 'var(--steel)'}}><use href="#bottle"/></svg>
        </div>
      </div>

      <div className="stats">
        <div className="card"><div className="muted">Vendues</div><div className="big">{bouteillesVendues}</div></div>
        <div className="card"><div className="muted">Encaissé</div><div className="big">{totalEncaisse.toLocaleString('fr-FR')} F</div></div>
        <div className="card"><div className="muted">Solde caisse</div><div className="big">{totalEncaisse.toLocaleString('fr-FR')} F</div></div>
        <div className="card"><div className="muted">Dettes clients</div><div className="big neg">{dettesClients.toLocaleString('fr-FR')} F</div></div>
      </div>

      <div className="btns">
        <button className="btn" onClick={onOuvrirAppro}>Approvisionner</button>
      </div>

      <h3>Dernières opérations</h3>
      <div className="list">
        {transactions.length === 0 ? (
          <div className="empty-state">Aucune opération. Touchez « + Vendre » pour commencer.</div>
        ) : (
          transactions.map((tx) => (
            <div className="item" key={tx.id}>
              <div className={`dot ${
                tx.type_operation === 'vente' ? 'sale' : 
                tx.type_operation === 'reglement_dette' ? 'payment' : 
                tx.type_operation === 'depense' ? 'expense' : 'supply'
              }`}></div>
              <div className="grow">
                <div style={{fontWeight: 600}}>
                  {tx.type_operation === 'vente' && 'Vente au comptoir'}
                  {tx.type_operation === 'approvisionnement' && 'Approvisionnement stock'}
                  {tx.type_operation === 'reglement_dette' && 'Règlement de dette'}
                  {tx.type_operation === 'depense' && (tx.description ? `Dépense : ${tx.description}` : 'Dépense de caisse')}
                  {tx.type_operation === 'ajustement' && 'Ajustement inventaire'}
                </div>
                <div className="muted" style={{fontSize: '12px'}}>
                  {new Date(tx.date_operation).toLocaleString('fr-FR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                  {tx.quantite_pleine > 0 && ` • ${tx.quantite_pleine} btl`}
                </div>
              </div>
              <div className={`amt ${['approvisionnement', 'depense'].includes(tx.type_operation) ? 'neg' : 'pos'}`}>
                {['approvisionnement', 'depense'].includes(tx.type_operation) ? '-' : '+'}{parseFloat(tx.montant_paye).toLocaleString('fr-FR')} F
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}