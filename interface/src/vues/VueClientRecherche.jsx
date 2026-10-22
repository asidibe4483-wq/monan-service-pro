import { useState, useEffect } from 'react';

export default function VueClientRecherche({ utilisateur, onDeconnexion }) {
  const [depots, setDepots] = useState([]);
  const [enChargement, setEnChargement] = useState(false);

  const obtenirGeolocalisationEtDepots = () => {
    setEnChargement(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          chargerDepots(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          chargerDepots();
        }
      );
    } else {
      chargerDepots();
    }
  };

  const chargerDepots = async (lat = '', lng = '') => {
    try {
      const url = lat && lng 
        ? `http://localhost:5000/api/client/depots-proches?lat=${lat}&lng=${lng}`
        : `http://localhost:5000/api/client/depots-proches`;

      const res = await fetch(url);
      const data = await res.json();
      setDepots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement dépôts :', err);
    } finally {
      setEnChargement(false);
    }
  };

  useEffect(() => {
    obtenirGeolocalisationEtDepots();
  }, []);

  return (
    <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0 }}>🔥 Dépôts de gaz</h2>
          <span className="muted" style={{ fontSize: '13px' }}>Bonjour, {utilisateur?.nom}</span>
        </div>
        <button 
          onClick={onDeconnexion} 
          style={{ background: '#FFE8E8', color: 'var(--red)', border: 'none', borderRadius: '16px', padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}
        >
          Déconnexion
        </button>
      </div>

      <button className="btn flame block" onClick={obtenirGeolocalisationEtDepots} style={{ marginBottom: '20px' }}>
        🔄 Localiser les dépôts autour de moi
      </button>

      {enChargement ? (
        <div className="empty-state">Recherche des stocks disponibles...</div>
      ) : depots.length === 0 ? (
        <div className="empty-state">Aucun dépôt de gaz disponible avec du stock actuellement.</div>
      ) : (
        <div className="list">
          {depots.map((depot) => (
            <div key={depot.id} className="card" style={{ marginBottom: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{depot.nom}</h3>
                  <div className="muted" style={{ fontSize: '13px' }}>📍 {depot.localisation}</div>
                  {depot.distance_km && (
                    <div style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: '600', marginTop: '2px' }}>
                      À {depot.distance_km} km de votre position
                    </div>
                  )}
                </div>

                <span 
                  style={{
                    background: depot.stock_disponible > 5 ? '#E6F4EA' : '#FFF4E5',
                    color: depot.stock_disponible > 5 ? '#137333' : '#B06000',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  {depot.stock_disponible} btl pleines
                </span>
              </div>

              {depot.telephone && (
                <a 
                  href={`tel:${depot.telephone}`} 
                  className="btn ghost block sm" 
                  style={{ marginTop: '12px', textAlign: 'center', textDecoration: 'none' }}
                >
                  📞 Appeler le dépôt ({depot.telephone})
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}