export default function FenetreTiroir({ isOpen, fermerTiroir, children }) {
  return (
    // Si isOpen est faux, on ajoute la classe 'hidden' pour cacher la fenêtre
    <div className={`sheetwrap ${isOpen ? '' : 'hidden'}`} id="sheet">
      {/* Le fond sombre. Si on clique dessus, ça ferme la fenêtre */}
      <div className="backdrop" onClick={fermerTiroir}></div>
      
      <div className="sheet" id="sheetBody">
        {/* 'children' permet d'injecter n'importe quel formulaire à l'intérieur */}
        {children}
      </div>
    </div>
  );
}