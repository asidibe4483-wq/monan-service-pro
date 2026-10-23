import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const VueStock = () => {
  const [stocks, setStocks] = useState(null);

  useEffect(() => {
    chargerStock();
  }, []);

  const chargerStock = async () => {
    try {
      const jeton = localStorage.getItem('jeton_monan');
      const res = await fetch(`${API_URL}/api/depots/stock`, {
        headers: { 'Authorization': `Bearer ${jeton}` }
      });
      const data = await res.json();
      setStocks(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="vue">
      <h2>État des Stocks</h2>
      {stocks && (
        <div className="cartes-stock">
          <div className="carte">Bouteilles Pleines: {stocks.stock_plein}</div>
          <div className="carte">Bouteilles Vides: {stocks.stock_vide}</div>
        </div>
      )}
    </div>
  );
};

export default VueStock;