import React from 'react';
import { API_URL } from '../config';

const VuePlus = ({ onDeconnexion }) => {
  const deconnecter = () => {
    localStorage.removeItem('jeton_monan');
    if (onDeconnexion) onDeconnexion();
  };

  return (
    <div className="vue">
      <h2>Options & Paramètres</h2>
      <p>Serveur Backend connecté : <code>{API_URL}</code></p>
      <button onClick={deconnecter} className="bouton-danger">Se déconnecter</button>
    </div>
  );
};

export default VuePlus;