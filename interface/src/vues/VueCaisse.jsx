export default function VueCaisse({ transactions = [], onOuvrirDepense }) {
  const totalEntrees = transactions
    .filter(tx => ['vente', 'reglement_dette'].includes(tx.type_operation))
    .reduce((sum, tx) => sum + parseFloat(tx.montant_paye || 0), 0);

  const totalSorties = transactions
    .filter(tx => ['approvisionnement', 'depense'].includes(tx.type_operation))
    .reduce((sum, tx) => sum + parseFloat(tx.montant_paye || 0), 0);

  const soldeCaisse = totalEntrees - totalSorties;

  const opFinancieres = transactions.filter(tx => 
    ['vente', 'reglement_dette', 'approvisionnement', 'depense'].includes(tx.type_operation)
  );

  return (
    <>
      <h2>Gestion de la Caisse</h2>

      <div className="card" style={{ background: 'var(--ink)', color: '#fff', marginBottom: '16px' }}>
        <div style={{ opacity: 0.8, fontSize: '13px' }}>Solde réel en caisse</div>
        <div className="big" style={{ fontSize: '32px', marginTop: '4px', color: soldeCaisse >= 0 ? '#4CD964' : 'var(--red)' }}>
          {soldeCaisse.toLocaleString('fr-FR')} F
        </div>
      </div>

      <div className="stats" style={{ marginBottom: '16px' }}>
        <div className="card">
          <div className="muted">Total Entrées</div>
          <div className="big pos" style={{ fontSize: '20px', marginTop: '4px' }}>
            +{totalEntrees.toLocaleString('fr-FR')} F
          </div>
        </div>
        <div className="card">
          <div className="muted">Total Sorties</div>
          <div className="big neg" style={{ fontSize: '20px', marginTop: '4px' }}>
            -{totalSorties.toLocaleString('fr-FR')} F
          </div>
        </div>
      </div>

      <div className="btns" style={{ marginBottom: '20px' }}>
        <button className="btn flame block" onClick={onOuvrirDepense}>
          − Enregistrer une Dépense
        </button>
      </div>

      <h3>Journal des mouvements d'espèces</h3>

      <div className="list">
        {opFinancieres.length === 0 ? (
          <div className="empty-state">Aucun mouvement financier enregistré.</div>
        ) : (
          opFinancieres.map((tx) => {
            const estEntree = ['vente', 'reglement_dette'].includes(tx.type_operation);
            return (
              <div className="item" key={tx.id}>
                <div className={`dot ${
                  tx.type_operation === 'vente' ? 'sale' : 
                  tx.type_operation === 'reglement_dette' ? 'payment' : 
                  tx.type_operation === 'depense' ? 'expense' : 'supply'
                }`}></div>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>
                    {tx.type_operation === 'vente' && 'Vente d\'espèces'}
                    {tx.type_operation === 'reglement_dette' && 'Règlement de dette'}
                    {tx.type_operation === 'approvisionnement' && 'Achat d\'approvisionnement'}
                    {tx.type_operation === 'depense' && (tx.description ? `Dépense : ${tx.description}` : 'Dépense de caisse')}
                  </div>
                  <div className="muted" style={{ fontSize: '12px' }}>
                    {new Date(tx.date_operation).toLocaleString('fr-FR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className={`amt ${estEntree ? 'pos' : 'neg'}`}>
                  {estEntree ? '+' : '-'}{parseFloat(tx.montant_paye).toLocaleString('fr-FR')} F
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}