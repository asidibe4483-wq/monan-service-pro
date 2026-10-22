export default function Navigation({ ongletActif, changerOnglet }) {
  // Liste de nos boutons avec leurs icônes SVG converties pour React
  const onglets = [
    { id: 'home', label: 'Accueil', path: <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/> },
    { id: 'stock', label: 'Stock', path: <><path d="M12 3l9 5v8l-9 5-9-5V8z"/><path d="M12 12l9-4M12 12L3 8M12 12v9"/></> },
    { id: 'clients', label: 'Clients', path: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.5 2.6 3.5 5.5"/></> },
    { id: 'cash', label: 'Caisse', path: <><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></> },
    { id: 'more', label: 'Plus', path: <><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></> }
  ];

  return (
    <nav>
      <div id="nav">
        {onglets.map((onglet) => (
          <button 
            key={onglet.id} 
            className={ongletActif === onglet.id ? 'on' : ''} 
            onClick={() => changerOnglet(onglet.id)}
          >
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {onglet.path}
            </svg>
            {onglet.label}
          </button>
        ))}
      </div>
    </nav>
  );
}