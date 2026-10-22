export default function VueStock({ depot, transactions = [], onOuvrirAjustement }) {
  if (!depot) return <div className="empty-state">Chargement des données...</div>;

  const totalBouteilles = depot.stock_plein + depot.stock_vide;

  // Filtrer les transactions qui ont un impact sur le stock
  const mouvementsStock = transactions.filter(tx => 
    ['vente', 'approvisionnement', 'ajustement'].includes(tx.type_operation)
  );

  return (
    <>
      <h2>Gestion du Stock</h2>

      <div className="tiles" style={{ marginBottom: '16px' }}>
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

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="muted">Parc total de bouteilles</div>
        <div className="big" style={{ marginTop: '2px' }}>{totalBouteilles} btl</div>
      </div>

      <div className="btns" style={{ marginBottom: '20px' }}>
        <button className="btn flame block" onClick={onOuvrirAjustement}>
          ± Ajuster le stock (Inventaire)
        </button>
      </div>

      <h3>Mouvements de stock récents</h3>

      <div className="list">
        {mouvementsStock.length === 0 ? (
          <div className="empty-state">Aucun mouvement de stock enregistré.</div>
        ) : (
          mouvementsStock.map((tx) => (
            <div className="item" key={tx.id}>
              <div className={`dot ${tx.type_operation === 'vente' ? 'sale' : tx.type_operation === 'approvisionnement' ? 'supply' : 'adjust'}`}></div>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>
                  {tx.type_operation === 'vente' && 'Vente'}
                  {tx.type_operation === 'approvisionnement' && 'Approvisionnement'}
                  {tx.type_operation === 'ajustement' && 'Ajustement inventaire'}
                </div>
                <div className="muted" style={{ fontSize: '12px' }}>
                  {new Date(tx.date_operation).toLocaleString('fr-FR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                {tx.quantite_pleine !== 0 && (
                  <div className={tx.quantite_pleine > 0 ? 'pos' : 'neg'}>
                    Pleines: {tx.quantite_pleine > 0 ? `+${tx.quantite_pleine}` : tx.quantite_pleine}
                  </div>
                )}
                {tx.quantite_vide !== 0 && (
                  <div className={tx.quantite_vide > 0 ? 'pos' : 'neg'}>
                    Vides: {tx.quantite_vide > 0 ? `+${tx.quantite_vide}` : tx.quantite_vide}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}