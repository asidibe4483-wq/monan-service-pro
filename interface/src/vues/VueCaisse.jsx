import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const VueCaisse = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    chargerCaisse();
  }, []);

  const chargerCaisse = async () => {
    try {
      const jeton = localStorage.getItem('jeton_monan');
      const res = await fetch(`${API_URL}/api/transactions`, {
        headers: { 'Authorization': `Bearer ${jeton}` }
      });
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="vue">
      <h2>Mouvements de Caisse</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Montant Payé</th>
            <th>Reste</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id}>
              <td>{t.type_operation}</td>
              <td>{t.montant_paye} FCFA</td>
              <td>{t.reste_a_payer} FCFA</td>
              <td>{new Date(t.date_operation).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VueCaisse;