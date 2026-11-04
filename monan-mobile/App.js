import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Pressable
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const API_URL = "https://monan-backend.onrender.com";

const FadeInView = ({ children, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 9,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ flex: 1 }, style, { opacity: fadeAnim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

const AnimatedButton = ({ onPress, style, children, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const QuantityStepper = ({ value, onChange }) => {
  const qty = parseInt(value, 10) || 1;
  return (
    <View style={styles.stepperContainer}>
      <Pressable
        style={[styles.stepperBtn, qty <= 1 && styles.stepperBtnDisabled]}
        onPress={() => onChange(Math.max(1, qty - 1).toString())}
        disabled={qty <= 1}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </Pressable>
      <View style={styles.stepperValueBox}>
        <Text style={styles.stepperValueText}>{qty}</Text>
      </View>
      <Pressable
        style={styles.stepperBtn}
        onPress={() => onChange((qty + 1).toString())}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </Pressable>
    </View>
  );
};

// CATALOGUE DÉTAILLÉ DE BOUTEILLES DE GAZ (COULEURS ET MARQUES EN CÔTE D'IVOIRE)
const MARQUES_GAZ = [
  { id: 'total', name: 'TotalEnergies', color: '#F97316', labelColor: 'Orange' },
  { id: 'shell', name: 'Shell Gas', color: '#1E40AF', labelColor: 'Bleue' },
  { id: 'petro', name: 'Pétro Ivoire', color: '#334155', labelColor: 'Bleu Nuit / Gris' },
  { id: 'oryx', name: 'Oryx Energies', color: '#0EA5E9', labelColor: 'Cyan' },
  { id: 'simam', name: 'Simam Gas', color: '#EAB308', labelColor: 'Jaune' },
  { id: 'districom', name: 'Districom Gaz', color: '#EF4444', labelColor: 'Rouge' },
  { id: 'ola', name: 'OLA Energy', color: '#991B1B', labelColor: 'Bordeaux' },
  { id: 'corlay', name: 'Corlay', color: '#16A34A', labelColor: 'Verte' },
];

const CYLINDER_TYPES = [
  { id: 'B6', name: 'B6 (6 kg)', format: '6 kg', priceRecharge: 2300, priceAchat: 13000 },
  { id: 'B12', name: 'B12 (12.5 kg)', format: '12.5 kg', priceRecharge: 5500, priceAchat: 25000 },
  { id: 'B28', name: 'B28 (28 kg)', format: '28 kg', priceRecharge: 13000, priceAchat: 45000 },
];

const PAYMENT_METHODS = [
  { id: 'wave', name: 'Wave', color: '#1DC3F3', logo: require('./assets/wave.jpeg') },
  { id: 'orange', name: 'Orange', color: '#FF6600', logo: require('./assets/Orange.jpeg') },
  { id: 'mtn', name: 'MTN MoMo', color: '#FFCC00', logo: require('./assets/MTN.jpeg') },
  { id: 'moov', name: 'Moov Money', color: '#0055A5', logo: require('./assets/Moov.jpeg') },
];

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('home');

  // Authentification
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');

  // Réinitialisation de mot de passe (3 Étapes)
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1);

  // Abonnement Vendeur
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('wave');
  const [paymentPhone, setPaymentPhone] = useState('');

  // Sélection Bouteille (Marque, Couleur, Format, Type d'opération)
  const [selectedMarque, setSelectedMarque] = useState(MARQUES_GAZ[0]);
  const [selectedCylinder, setSelectedCylinder] = useState(CYLINDER_TYPES[1]);
  const [operationType, setOperationType] = useState('recharge'); // 'recharge' ou 'achat'
  const [quantite, setQuantite] = useState('1');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');

  // Dépôts
  const [searchDepot, setSearchDepot] = useState('');
  const [depotsList] = useState([
    { id: 'DEP-01', nom: 'Dépôt Angré 8ème Tranche', distance: '0.8 km', quartier: 'Cocody Angré', statut: 'Ouvert', b6: 14, b12: 28, b28: 5 },
    { id: 'DEP-02', nom: 'Dépôt Saint-Jean', distance: '2.3 km', quartier: 'Cocody Centre', statut: 'Ouvert', b6: 8, b12: 12, b28: 0 },
    { id: 'DEP-03', nom: 'Dépôt Yopougon Maroc', distance: '5.1 km', quartier: 'Yopougon', statut: 'Ouvert', b6: 22, b12: 35, b28: 10 },
  ]);

  // Commandes
  const [commandes, setCommandes] = useState([]);

  // Stocks Vendeur
  const [stockB6, setStockB6] = useState('10');
  const [stockB12, setStockB12] = useState('25');
  const [stockB28, setStockB28] = useState('5');

  // Bilan des ventes Vendeur
  const [salesPeriod, setSalesPeriod] = useState('day');
  const [dayOffset, setDayOffset] = useState(0);
  const [salesReport, setSalesReport] = useState({
    totalRecette: 185000,
    count: 12,
    totals: { b6: 8, b12: 18, b28: 4 },
    sales: [
      { id: 101, client_nom: 'Kouassi Yves', marque: 'TotalEnergies', couleur: '#F97316', bouteille_type: 'B12 (12.5 kg)', type_operation: 'Recharge', quantite: 2, montant_total: 11000, created_at: new Date().toISOString() },
      { id: 102, client_nom: 'Mme Koné', marque: 'Shell Gas', couleur: '#1E40AF', bouteille_type: 'B6 (6 kg)', type_operation: 'Recharge', quantite: 1, montant_total: 2500, created_at: new Date().toISOString() },
      { id: 103, client_nom: 'Restaurant Le Lagon', marque: 'Pétro Ivoire', couleur: '#334155', bouteille_type: 'B28 (28 kg)', type_operation: 'Achat', quantite: 2, montant_total: 90000, created_at: new Date().toISOString() },
    ]
  });

  // Vente directe Vendeur
  const [newSaleClient, setNewSaleClient] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsAppReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user && user.role === 'depot' && dashboardTab === 'sales_report') {
      fetchSalesReport();
    }
  }, [salesPeriod, dayOffset, dashboardTab]);

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/sales/report?period=${salesPeriod}&date_offset=${dayOffset}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.sales && data.sales.length > 0) {
          setSalesReport(data);
        }
      }
    } catch (err) {
      console.log('Utilisation du bilan local par défaut');
    } finally {
      setLoading(false);
    }
  };

  const currentUnitPrice = operationType === 'recharge' ? selectedCylinder.priceRecharge : selectedCylinder.priceAchat;

  const handleAddDirectSale = async () => {
    const qtyNum = parseInt(quantite, 10) || 1;
    const pu = currentUnitPrice;
    const total = qtyNum * pu;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depot_id: user.id || 1,
          client_nom: newSaleClient.trim() || 'Client Passage',
          bouteille_type: selectedCylinder.name,
          marque: selectedMarque.name,
          couleur: selectedMarque.color,
          type_operation: operationType === 'recharge' ? 'Recharge' : 'Achat Bouteille',
          quantite: qtyNum,
          prix_unitaire: pu
        })
      });

      if (response.ok) {
        Alert.alert('Vente enregistrée !', `Montant total : ${total.toLocaleString('fr-FR')} FCFA`);
        setNewSaleClient('');
        fetchSalesReport();
      } else {
        throw new Error('Erreur lors de l\'enregistrement');
      }
    } catch (err) {
      const newSaleLocal = {
        id: Date.now(),
        client_nom: newSaleClient.trim() || 'Client Passage',
        marque: selectedMarque.name,
        couleur: selectedMarque.color,
        bouteille_type: selectedCylinder.name,
        type_operation: operationType === 'recharge' ? 'Recharge' : 'Achat Bouteille',
        quantite: qtyNum,
        montant_total: total,
        created_at: new Date().toISOString()
      };
      setSalesReport({
        ...salesReport,
        totalRecette: salesReport.totalRecette + total,
        count: salesReport.count + 1,
        sales: [newSaleLocal, ...salesReport.sales]
      });
      Alert.alert('Vente ajoutée au bilan !', `Montant total : ${total.toLocaleString('fr-FR')} FCFA`);
      setNewSaleClient('');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDFReport = async () => {
    let periodTitle = 'BILAN DES VENTES JOURNALIER';
    if (salesPeriod === 'day') {
      if (dayOffset === 0) periodTitle = 'BILAN DU JOUR (AUJOURD\'HUI)';
      else if (dayOffset === -1) periodTitle = 'BILAN DU JOUR (HIER)';
      else periodTitle = 'BILAN DU JOUR (AVANT-HIER)';
    } else if (salesPeriod === 'week') {
      periodTitle = 'BILAN HEBDOMADAIRE (7 DERNIERS JOURS)';
    } else if (salesPeriod === 'month') {
      periodTitle = 'BILAN MENSUEL DU MOIS EN COURS';
    } else if (salesPeriod === 'year') {
      periodTitle = 'BILAN ANNUEL DE L\'ANNÉE EN COURS';
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #0F172A; }
            .header { text-align: center; border-bottom: 3px solid #F97316; padding-bottom: 12px; margin-bottom: 20px; }
            .brand { color: #0F172A; font-size: 24px; font-weight: 900; letter-spacing: 1px; }
            .subtitle { color: #F97316; font-size: 14px; font-weight: 800; margin-top: 4px; }
            .meta-info { margin-bottom: 20px; font-size: 12px; color: #475569; display: flex; justify-content: space-between; }
            .kpi-container { display: flex; gap: 12px; margin-bottom: 24px; }
            .kpi-box { flex: 1; background-color: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 12px; text-align: center; }
            .kpi-label { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; }
            .kpi-value { font-size: 18px; font-weight: 900; color: #F97316; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #0F172A; color: #FFFFFF; font-size: 11px; font-weight: 800; text-align: left; padding: 10px; }
            td { border-bottom: 1px solid #E2E8F0; padding: 10px; font-size: 12px; color: #334155; }
            tr:nth-child(even) { background-color: #F8FAFC; }
            .color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
            .total-row td { font-weight: bold; background-color: #FEF3C7; color: #92400E; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">MONAN SERVICE PRO</div>
            <div class="subtitle">${periodTitle}</div>
          </div>

          <div class="meta-info">
            <div><strong>Dépôt / Vendeur :</strong> ${user?.nom || 'Dépôt Partenaire'}</div>
            <div><strong>Généré le :</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
          </div>

          <div class="kpi-container">
            <div class="kpi-box">
              <div class="kpi-label">Recette Totale</div>
              <div class="kpi-value">${salesReport.totalRecette.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Ventes Effectuées</div>
              <div class="kpi-value">${salesReport.count} transactions</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Bouteilles B12</div>
              <div class="kpi-value">${salesReport.totals.b12} vendues</div>
            </div>
          </div>

          <h3>Détail des Transactions :</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Client</th>
                <th>Marque & Bouteille</th>
                <th>Type</th>
                <th>Qté</th>
                <th>Montant Total</th>
              </tr>
            </thead>
            <tbody>
              ${salesReport.sales.map((s, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${s.client_nom || 'Client Passage'}</td>
                  <td><span class="color-dot" style="background-color: ${s.couleur || '#F97316'};"></span>${s.marque || 'Total'} ${s.bouteille_type}</td>
                  <td>${s.type_operation || 'Recharge'}</td>
                  <td>${s.quantite}</td>
                  <td><strong>${(parseInt(s.montant_total) || 0).toLocaleString('fr-FR')} FCFA</strong></td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="5" style="text-align: right;"><strong>TOTAL GÉNÉRAL :</strong></td>
                <td><strong>${salesReport.totalRecette.toLocaleString('fr-FR')} FCFA</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Document officiel généré automatiquement par l'application Monan Service Pro — Plateforme de distribution de gaz.
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Impression PDF', 'Aperçu ou enregistrement PDF lancé.');
    }
  };

  const getDaysLeftInTrial = (createdAtDate) => {
    if (!createdAtDate) return 30;
    const created = new Date(createdAtDate);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 30 - diffDays;
    return remaining > 0 ? remaining : 0;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Veuillez saisir votre email et votre mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(`Erreur serveur (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Identifiants incorrects.');
      }

      const rawUser = data.user || data;
      const fetchedRole = String(
        rawUser.role || data.role || rawUser.user_type || ''
      ).toLowerCase().trim();

      const isDepotUser = 
        fetchedRole === 'depot' || 
        fetchedRole === 'vendeur' || 
        email.toLowerCase().includes('depot') || 
        email.toLowerCase().includes('vendeur');

      const userData = {
        ...rawUser,
        email: rawUser.email || email.trim().toLowerCase(),
        nom: rawUser.nom || data.nom || email.split('@')[0],
        role: isDepotUser ? 'depot' : 'client',
        createdAt: rawUser.createdAt || rawUser.created_at || new Date().toISOString(),
        isSubscribed: rawUser.isSubscribed || rawUser.is_subscribed || false
      };

      setUser(userData);
      setAdresseLivraison(userData.adresse || '');
      setDashboardTab('home');
    } catch (error) {
      Alert.alert('Connexion impossible', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (type) => {
    if (!nom || !telephone || !email || !password) {
      Alert.alert('Formulaire incomplet', 'Veuillez remplir les champs obligatoires (*).');
      return;
    }

    setLoading(true);
    const endpoint = type === 'depot' ? '/api/auth/register-depot' : '/api/auth/register-client';

    try {
      const registrationDate = new Date().toISOString();
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          nom: nom.trim(),
          telephone: telephone.trim(),
          adresse: adresse.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: type,
        }),
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(`Erreur serveur (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Échec de la création du compte.');
      }

      const newUser = data.user || {
        nom,
        email,
        telephone,
        adresse,
        role: type,
        createdAt: registrationDate,
        isSubscribed: false
      };

      setUser({
        ...newUser,
        role: type
      });
      setAdresseLivraison(adresse.trim());
      setDashboardTab('home');
    } catch (error) {
      Alert.alert('Inscription échouée', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async () => {
    if (!forgotEmail) {
      Alert.alert('Champ requis', 'Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Adresse email introuvable.");
      }

      setResetStep(2);
      Alert.alert('Code transmis !', data.message);
    } catch (error) {
      Alert.alert('Erreur de réinitialisation', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!resetCode || resetCode.trim().length !== 5) {
      Alert.alert('Code invalide', 'Veuillez saisir le code de sécurité à 5 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: resetCode.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Code incorrect ou expiré.");
      }

      setResetStep(3);
    } catch (error) {
      Alert.alert('Échec de vérification', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmNewPassword = async () => {
    if (!newPassword || newPassword.trim().length < 6) {
      Alert.alert('Mot de passe invalide', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: resetCode.trim(),
          newPassword: newPassword.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de mettre à jour le mot de passe.");
      }

      Alert.alert('Mot de passe mis à jour !', data.message, [
        {
          text: 'Se connecter',
          onPress: () => {
            setEmail(forgotEmail);
            setForgotEmail('');
            setResetCode('');
            setNewPassword('');
            setResetStep(1);
            setCurrentScreen('login');
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSubscription = () => {
    if (!paymentPhone) {
      Alert.alert('Numéro requis', 'Veuillez saisir le numéro à débiter.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setUser({ ...user, isSubscribed: true });
      setShowPaymentSection(false);
      Alert.alert('Paiement confirmé', 'Votre abonnement Monan Pro est maintenant actif.');
    }, 1400);
  };

  const handleCreateOrder = () => {
    if (!adresseLivraison) {
      Alert.alert('Adresse requise', 'Veuillez préciser votre adresse de livraison.');
      return;
    }

    const qteNum = parseInt(quantite, 10) || 1;
    const pu = currentUnitPrice;
    const totalCalculated = qteNum * pu;

    const newCmd = {
      id: `CMD-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('fr-FR'),
      type: `${selectedMarque.name} ${selectedCylinder.name} (${operationType === 'recharge' ? 'Recharge' : 'Achat'})`,
      qte: qteNum,
      statut: 'En cours de livraison',
      codeStatut: 'pending',
      total: `${totalCalculated.toLocaleString('fr-FR')} FCFA`
    };

    setCommandes([newCmd, ...commandes]);
    Alert.alert(
      'Commande enregistrée !',
      `Votre commande de ${qteNum}x ${selectedMarque.name} ${selectedCylinder.name} (${operationType === 'recharge' ? 'Recharge' : 'Achat'}) est en cours de préparation.`,
      [{ text: 'Suivre ma commande', onPress: () => setDashboardTab('orders_list') }]
    );
  };

  const handleLogout = () => {
    setUser(null);
    setEmail('');
    setPassword('');
    setNom('');
    setTelephone('');
    setAdresse('');
    setShowPaymentSection(false);
    setCurrentScreen('welcome');
    setDashboardTab('home');
  };

  const filteredDepots = depotsList.filter(d => 
    d.nom.toLowerCase().includes(searchDepot.toLowerCase()) || 
    d.quartier.toLowerCase().includes(searchDepot.toLowerCase())
  );

  const filteredCommandes = commandes.filter(cmd => {
    if (orderFilter === 'pending') return cmd.codeStatut === 'pending';
    if (orderFilter === 'delivered') return cmd.codeStatut === 'delivered';
    return true;
  });

  if (!isAppReady) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
        <Image source={require('./assets/splash-icon.png')} style={styles.splashLogo} resizeMode="contain" />
        <Text style={styles.splashTitle}>MONAN SERVICE</Text>
        <Text style={styles.splashSubTitle}>DISTRIBUTION DE GAZ</Text>
        <ActivityIndicator size="small" color="#F97316" style={{ marginTop: 28 }} />
      </View>
    );
  }

  const daysLeft = user ? getDaysLeftInTrial(user.createdAt) : 30;
  const isTrialExpired = user && user.role === 'depot' && !user.isSubscribed && daysLeft <= 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* Header */}
      <View style={styles.appBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Image
              source={require('./assets/splash-icon.png')}
              style={styles.brandLogoImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.brandTitle}>MONAN SERVICE</Text>
            <Text style={styles.brandSub}>
              {user ? (user.role === 'depot' ? 'ESPACE DÉPÔT' : 'ESPACE CLIENT') : 'DISTRIBUTION DE GAZ'}
            </Text>
          </View>
        </View>

        {user && (
          <AnimatedButton style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Déconnexion</Text>
          </AnimatedButton>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {user ? (
            (isTrialExpired || showPaymentSection) ? (
              <FadeInView style={styles.mainWrapper}>
                <View style={styles.cardBox}>
                  {user.role === 'depot' && !isTrialExpired && (
                    <AnimatedButton onPress={() => setShowPaymentSection(false)} style={styles.backBtnInline}>
                      <Text style={styles.backBtnInlineText}>Retour </Text>
                    </AnimatedButton>
                  )}

                  <Text style={[styles.cardBoxTitle, { textAlign: 'center' }]}>Abonnement Vendeur</Text>
                  <Text style={styles.subTitleCenter}>
                    Sélectionnez votre mode de paiement Mobile Money :
                  </Text>

                  <View style={styles.subCard}>
                    <Text style={styles.subCardBadge}>ACCÈS ILLIMITÉ</Text>
                    <Text style={styles.subCardTitle}>Monan Pro</Text>
                    <Text style={styles.subCardPrice}>3 000 FCFA <Text style={styles.subCardMonth}>/ mois</Text></Text>
                  </View>

                  <Text style={styles.label}>Mode de paiement</Text>
                  <View style={styles.paymentMethodsGrid}>
                    {PAYMENT_METHODS.map((pm) => {
                      const isSelected = selectedPayment === pm.id;
                      return (
                        <AnimatedButton
                          key={pm.id}
                          style={[styles.paymentBtn, isSelected && { borderColor: pm.color, borderWidth: 2, backgroundColor: '#FFFFFF' }]}
                          onPress={() => setSelectedPayment(pm.id)}
                        >
                          <Image 
                            source={pm.logo} 
                            style={styles.paymentLogoImage} 
                            resizeMode="contain" 
                          />
                          <Text style={[styles.paymentBtnText, isSelected && { color: '#0F172A', fontWeight: '800' }]}>{pm.name}</Text>
                        </AnimatedButton>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Numéro de téléphone de débit *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    placeholder="07 00 00 00 00"
                    placeholderTextColor="#94A3B8"
                    value={paymentPhone}
                    onChangeText={setPaymentPhone}
                  />

                  <AnimatedButton style={styles.btnOrange} onPress={handleProcessSubscription} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Valider et Payer l'abonnement</Text>}
                  </AnimatedButton>
                </View>
              </FadeInView>
            ) : (
              <FadeInView key={dashboardTab} style={styles.mainWrapper}>
                {user.role === 'depot' && (
                  <View style={styles.trialBannerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trialBannerTitle}>
                        {user.isSubscribed ? '✅ Abonnement Vendeur Actif' : `Essai gratuit : ${daysLeft} jours restants`}
                      </Text>
                      {!user.isSubscribed && (
                        <Text style={styles.trialBannerSub}>Passez au Pass Pro pour conserver la gestion de vos stocks.</Text>
                      )}
                    </View>
                    {!user.isSubscribed && (
                      <AnimatedButton style={styles.btnPayNowInline} onPress={() => setShowPaymentSection(true)}>
                        <Text style={styles.btnPayNowInlineText}>Activer</Text>
                      </AnimatedButton>
                    )}
                  </View>
                )}

                <View style={styles.pillsContainerOuter}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pillsScrollContent}
                  >
                    <AnimatedButton
                      style={[styles.pillBtn, dashboardTab === 'home' && styles.pillBtnActive]}
                      onPress={() => setDashboardTab('home')}
                    >
                      <Text style={[styles.pillText, dashboardTab === 'home' && styles.pillTextActive]}>Accueil</Text>
                    </AnimatedButton>

                    {user.role === 'depot' ? (
                      <>
                        <AnimatedButton
                          style={[styles.pillBtn, dashboardTab === 'sales_report' && styles.pillBtnActive]}
                          onPress={() => setDashboardTab('sales_report')}
                        >
                          <Text style={[styles.pillText, dashboardTab === 'sales_report' && styles.pillTextActive]}>Bilan & PDF 📊</Text>
                        </AnimatedButton>
                        <AnimatedButton
                          style={[styles.pillBtn, dashboardTab === 'add_stock' && styles.pillBtnActive]}
                          onPress={() => setDashboardTab('add_stock')}
                        >
                          <Text style={[styles.pillText, dashboardTab === 'add_stock' && styles.pillTextActive]}>Gestion Stock</Text>
                        </AnimatedButton>
                        <AnimatedButton
                          style={[styles.pillBtn, dashboardTab === 'sales_list' && styles.pillBtnActive]}
                          onPress={() => setDashboardTab('sales_list')}
                        >
                          <Text style={[styles.pillText, dashboardTab === 'sales_list' && styles.pillTextActive]}>Inventaire</Text>
                        </AnimatedButton>
                      </>
                    ) : (
                      <>
                        <AnimatedButton
                          style={[styles.pillBtn, dashboardTab === 'depots' && styles.pillBtnActive]}
                          onPress={() => setDashboardTab('depots')}
                        >
                          <Text style={[styles.pillText, dashboardTab === 'depots' && styles.pillTextActive]}>Dépôts 📍</Text>
                        </AnimatedButton>
                        <AnimatedButton
                          style={[styles.pillBtn, dashboardTab === 'order' && styles.pillBtnActive]}
                          onPress={() => setDashboardTab('order')}
                        >
                          <Text style={[styles.pillText, dashboardTab === 'order' && styles.pillTextActive]}>Commander</Text>
                        </AnimatedButton>
                        <AnimatedButton
                          style={[styles.pillBtn, dashboardTab === 'orders_list' && styles.pillBtnActive]}
                          onPress={() => setDashboardTab('orders_list')}
                        >
                          <Text style={[styles.pillText, dashboardTab === 'orders_list' && styles.pillTextActive]}>
                            Suivi ({commandes.length})
                          </Text>
                        </AnimatedButton>
                      </>
                    )}
                  </ScrollView>
                </View>

                {dashboardTab === 'home' && (
                  <View style={styles.fullSection}>
                    <View style={styles.userGreetingCard}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {(user.nom || user.email || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.greetingTitle}>Bonjour, {user.nom || 'Cher client'} </Text>
                        <Text style={styles.greetingSubtitle}>
                          {user.role === 'depot' ? 'Gérez vos ventes, bilans et stocks' : 'Rechargez votre bouteille de gaz en quelques clics'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.kpiGrid}>
                      {user.role === 'depot' ? (
                        <>
                          <View style={styles.kpiCard}>
                            <Text style={styles.kpiCardTag}>RECETTE DU JOUR</Text>
                            <Text style={styles.kpiCardNum}>{salesReport.totalRecette.toLocaleString('fr-FR')} FCFA</Text>
                          </View>
                          <View style={styles.kpiCard}>
                            <Text style={styles.kpiCardTag}>TRANSACTIONS</Text>
                            <Text style={styles.kpiCardNum}>{salesReport.count}</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={styles.kpiCard}>
                            <Text style={styles.kpiCardTag}>COMMANDES</Text>
                            <Text style={styles.kpiCardNum}>{commandes.length}</Text>
                          </View>
                          <View style={styles.kpiCard}>
                            <Text style={styles.kpiCardTag}>DÉPÔTS ACTIFS</Text>
                            <Text style={styles.kpiCardNum}>3</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {user.role === 'depot' ? (
                      <View style={{ gap: 12 }}>
                        <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('sales_report')}>
                          <Text style={styles.actionCardTitle}>📊 Bilan des ventes & Export PDF</Text>
                          <Text style={styles.actionCardSub}>Consultez l'historique journalier, hebdomadaire, mensuel ou annuel</Text>
                        </AnimatedButton>

                        <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('add_stock')}>
                          <Text style={styles.actionCardTitleWhite}>Mettre à jour les stocks</Text>
                          <Text style={styles.actionCardSubWhite}>Modifiez les quantités de bouteilles B6, B12 et B28</Text>
                        </AnimatedButton>

                        {!user.isSubscribed && (
                          <AnimatedButton style={styles.actionCardNavy} onPress={() => setShowPaymentSection(true)}>
                            <Text style={styles.actionCardTitleWhite}>💳 Passez à Monan pro pour plus d'avantages</Text>
                            <Text style={styles.actionCardSubWhite}>Accédez à toutes les fonctionnalités vendeurs</Text>
                          </AnimatedButton>
                        )}
                      </View>
                    ) : (
                      <View style={{ gap: 12 }}>
                        <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('depots')}>
                          <Text style={styles.actionCardTitle}>Trouver un dépôt à proximité</Text>
                          <Text style={styles.actionCardSub}>Consultez la disponibilité autour de vous</Text>
                        </AnimatedButton>

                        <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('order')}>
                          <Text style={styles.actionCardTitleWhite}> Commander une livraison</Text>
                          <Text style={styles.actionCardSubWhite}>Recevez votre recharge directement à domicile</Text>
                        </AnimatedButton>
                      </View>
                    )}
                  </View>
                )}

                {/* ÉCRAN BILAN DES VENTES & PDF (VENDEUR) */}
                {dashboardTab === 'sales_report' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Bilan des Ventes & PDF 📊</Text>

                    <Text style={styles.label}>Sélectionnez la période :</Text>
                    <View style={styles.filterRow}>
                      <AnimatedButton style={[styles.filterBtn, salesPeriod === 'day' && styles.filterBtnActive]} onPress={() => setSalesPeriod('day')}>
                        <Text style={[styles.filterText, salesPeriod === 'day' && styles.filterTextActive]}>Journalier</Text>
                      </AnimatedButton>
                      <AnimatedButton style={[styles.filterBtn, salesPeriod === 'week' && styles.filterBtnActive]} onPress={() => setSalesPeriod('week')}>
                        <Text style={[styles.filterText, salesPeriod === 'week' && styles.filterTextActive]}>Hebdo</Text>
                      </AnimatedButton>
                      <AnimatedButton style={[styles.filterBtn, salesPeriod === 'month' && styles.filterBtnActive]} onPress={() => setSalesPeriod('month')}>
                        <Text style={[styles.filterText, salesPeriod === 'month' && styles.filterTextActive]}>Mensuel</Text>
                      </AnimatedButton>
                      <AnimatedButton style={[styles.filterBtn, salesPeriod === 'year' && styles.filterBtnActive]} onPress={() => setSalesPeriod('year')}>
                        <Text style={[styles.filterText, salesPeriod === 'year' && styles.filterTextActive]}>Annuel</Text>
                      </AnimatedButton>
                    </View>

                    {salesPeriod === 'day' && (
                      <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
                        <AnimatedButton style={[styles.dateOffsetBtn, dayOffset === 0 && styles.dateOffsetBtnActive]} onPress={() => setDayOffset(0)}>
                          <Text style={[styles.dateOffsetText, dayOffset === 0 && styles.dateOffsetTextActive]}>Aujourd'hui</Text>
                        </AnimatedButton>
                        <AnimatedButton style={[styles.dateOffsetBtn, dayOffset === -1 && styles.dateOffsetBtnActive]} onPress={() => setDayOffset(-1)}>
                          <Text style={[styles.dateOffsetText, dayOffset === -1 && styles.dateOffsetTextActive]}>Hier</Text>
                        </AnimatedButton>
                        <AnimatedButton style={[styles.dateOffsetBtn, dayOffset === -2 && styles.dateOffsetBtnActive]} onPress={() => setDayOffset(-2)}>
                          <Text style={[styles.dateOffsetText, dayOffset === -2 && styles.dateOffsetTextActive]}>Avant-hier</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    <View style={styles.totalSummary}>
                      <View>
                        <Text style={styles.totalSummaryLabel}>Chiffre d'Affaires :</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                          {salesReport.count} vente(s) enregistrée(s)
                        </Text>
                      </View>
                      <Text style={styles.totalSummaryValue}>
                        {salesReport.totalRecette.toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>

                    <AnimatedButton style={styles.btnNavyPdf} onPress={handlePrintPDFReport}>
                      <Text style={styles.btnNavyPdfText}>📄 Voir / Imprimer Bilan PDF</Text>
                    </AnimatedButton>

                    <Text style={[styles.label, { marginTop: 18 }]}>Saisie Vente Directe :</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nom du client (optionnel)"
                      placeholderTextColor="#94A3B8"
                      value={newSaleClient}
                      onChangeText={setNewSaleClient}
                    />

                    {/* Sélection Marque & Couleur */}
                    <Text style={styles.label}>Marque de bouteille :</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                      {MARQUES_GAZ.map((m) => {
                        const isSelected = selectedMarque.id === m.id;
                        return (
                          <AnimatedButton
                            key={m.id}
                            style={[styles.marqueChip, isSelected && { borderColor: m.color, borderWidth: 2, backgroundColor: '#FFF7ED' }]}
                            onPress={() => setSelectedMarque(m)}
                          >
                            <View style={[styles.colorBadge, { backgroundColor: m.color }]} />
                            <Text style={[styles.marqueChipText, isSelected && { color: '#0F172A', fontWeight: '800' }]}>{m.name}</Text>
                          </AnimatedButton>
                        );
                      })}
                    </ScrollView>

                    {/* Sélection Type Opération */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <AnimatedButton
                        style={[styles.opTypeBtn, operationType === 'recharge' && styles.opTypeBtnActive]}
                        onPress={() => setOperationType('recharge')}
                      >
                        <Text style={[styles.opTypeText, operationType === 'recharge' && styles.opTypeTextActive]}>Recharge (Échange)</Text>
                      </AnimatedButton>
                      <AnimatedButton
                        style={[styles.opTypeBtn, operationType === 'achat' && styles.opTypeBtnActive]}
                        onPress={() => setOperationType('achat')}
                      >
                        <Text style={[styles.opTypeText, operationType === 'achat' && styles.opTypeTextActive]}>Achat Bouteille Neuve</Text>
                      </AnimatedButton>
                    </View>

                    {/* Sélection Format */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                      {CYLINDER_TYPES.map((cyl) => (
                        <AnimatedButton
                          key={cyl.id}
                          style={[styles.smallCylBtn, selectedCylinder.id === cyl.id && styles.smallCylBtnActive]}
                          onPress={() => setSelectedCylinder(cyl)}
                        >
                          <Text style={[styles.smallCylText, selectedCylinder.id === cyl.id && styles.smallCylTextActive]}>{cyl.id}</Text>
                          <Text style={{ fontSize: 9, color: selectedCylinder.id === cyl.id ? '#C2410C' : '#64748B' }}>
                            {(operationType === 'recharge' ? cyl.priceRecharge : cyl.priceAchat).toLocaleString('fr-FR')} F
                          </Text>
                        </AnimatedButton>
                      ))}
                    </View>

                    <QuantityStepper value={quantite} onChange={setQuantite} />

                    <AnimatedButton style={styles.btnOrange} onPress={handleAddDirectSale} disabled={loading}>
                      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Enregistrer Vente ({ (currentUnitPrice * (parseInt(quantite, 10) || 1)).toLocaleString('fr-FR') } FCFA)</Text>}
                    </AnimatedButton>

                    <Text style={[styles.label, { marginTop: 20 }]}>Historique détaillé :</Text>
                    {salesReport.sales.map((sale) => (
                      <View key={sale.id} style={styles.saleRow}>
                        <View style={[styles.colorBadgeLarge, { backgroundColor: sale.couleur || '#F97316' }]} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.saleClient}>{sale.client_nom || 'Client Passage'} • <Text style={{ color: '#F97316' }}>{sale.marque || 'Total'}</Text></Text>
                          <Text style={styles.saleType}>{sale.quantite}x {sale.bouteille_type} ({sale.type_operation || 'Recharge'})</Text>
                        </View>
                        <Text style={styles.saleTotal}>{(parseInt(sale.montant_total) || 0).toLocaleString('fr-FR')} FCFA</Text>
                      </View>
                    ))}
                  </View>
                )}

                {dashboardTab === 'depots' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Dépôts à proximité 📍</Text>

                    <View style={styles.searchBoxContainer}>
                      <Text style={styles.searchIcon}>🔍</Text>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Recherche par quartier ou commune..."
                        placeholderTextColor="#94A3B8"
                        value={searchDepot}
                        onChangeText={setSearchDepot}
                      />
                    </View>

                    {filteredDepots.map((depot) => (
                      <View key={depot.id} style={styles.depotCard}>
                        <View style={styles.depotHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.depotTitle}>{depot.nom}</Text>
                            <Text style={styles.depotSub}>{depot.quartier} • <Text style={styles.depotDistance}>{depot.distance}</Text></Text>
                          </View>
                          <View style={styles.depotStatusBadge}>
                            <Text style={styles.depotStatusText}>● {depot.statut}</Text>
                          </View>
                        </View>

                        <View style={styles.stockChipsRow}>
                          <View style={styles.stockChip}>
                            <Text style={styles.stockChipLabel}>B6</Text>
                            <Text style={styles.stockChipVal}>{depot.b6} dispo</Text>
                          </View>
                          <View style={styles.stockChip}>
                            <Text style={styles.stockChipLabel}>B12</Text>
                            <Text style={depot.b12 > 0 ? styles.stockChipVal : styles.stockChipValEmpty}>
                              {depot.b12 > 0 ? `${depot.b12} dispo` : 'Rupture'}
                            </Text>
                          </View>
                          <View style={styles.stockChip}>
                            <Text style={styles.stockChipLabel}>B28</Text>
                            <Text style={styles.stockChipVal}>{depot.b28} dispo</Text>
                          </View>
                        </View>

                        <AnimatedButton
                          style={styles.btnDepotSelect}
                          onPress={() => {
                            setAdresseLivraison(depot.quartier);
                            setDashboardTab('order');
                          }}
                        >
                          <Text style={styles.btnDepotSelectText}>Commander dans ce dépôt</Text>
                        </AnimatedButton>
                      </View>
                    ))}
                  </View>
                )}

                {dashboardTab === 'order' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Passer une commande</Text>

                    {/* Sélection Type d'opération */}
                    <Text style={styles.label}>Mode d'achat :</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                      <AnimatedButton
                        style={[styles.opTypeBtn, operationType === 'recharge' && styles.opTypeBtnActive]}
                        onPress={() => setOperationType('recharge')}
                      >
                        <Text style={[styles.opTypeText, operationType === 'recharge' && styles.opTypeTextActive]}>Recharge Bouteille (2 300 / 5 500 F)</Text>
                      </AnimatedButton>
                      <AnimatedButton
                        style={[styles.opTypeBtn, operationType === 'achat' && styles.opTypeBtnActive]}
                        onPress={() => setOperationType('achat')}
                      >
                        <Text style={[styles.opTypeText, operationType === 'achat' && styles.opTypeTextActive]}>Achat Bouteille Neuve</Text>
                      </AnimatedButton>
                    </View>

                    {/* Sélection Marque & Couleur */}
                    <Text style={styles.label}>Marque et Couleur de la bouteille :</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                      {MARQUES_GAZ.map((m) => {
                        const isSelected = selectedMarque.id === m.id;
                        return (
                          <AnimatedButton
                            key={m.id}
                            style={[styles.marqueCardGrid, isSelected && { borderColor: m.color, borderWidth: 2, backgroundColor: '#FFF7ED' }]}
                            onPress={() => setSelectedMarque(m)}
                          >
                            <View style={[styles.bottleVisualCircle, { backgroundColor: m.color }]}>
                              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>🔥</Text>
                            </View>
                            <Text style={[styles.marqueCardTitle, isSelected && { color: '#0F172A', fontWeight: '800' }]}>{m.name}</Text>
                            <Text style={styles.marqueCardColor}>{m.labelColor}</Text>
                          </AnimatedButton>
                        );
                      })}
                    </ScrollView>

                    <Text style={styles.label}>Format de bouteille</Text>
                    <View style={styles.cylinderList}>
                      {CYLINDER_TYPES.map((cyl) => {
                        const isSelected = selectedCylinder.id === cyl.id;
                        const price = operationType === 'recharge' ? cyl.priceRecharge : cyl.priceAchat;
                        return (
                          <AnimatedButton
                            key={cyl.id}
                            style={[styles.cylinderItem, isSelected && styles.cylinderItemActive]}
                            onPress={() => setSelectedCylinder(cyl)}
                          >
                            <View style={styles.cylinderHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.colorBadge, { backgroundColor: selectedMarque.color }]} />
                                <Text style={styles.cylinderTitle}>{selectedMarque.name} - {cyl.name}</Text>
                              </View>
                              <Text style={styles.cylinderPrice}>{price.toLocaleString('fr-FR')} FCFA</Text>
                            </View>
                          </AnimatedButton>
                        );
                      })}
                    </View>

                    <Text style={styles.label}>Quantité désirée</Text>
                    <QuantityStepper value={quantite} onChange={setQuantite} />

                    <Text style={styles.label}>Où voulez-vous recevoir *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Cocody Angré 8ème Tranche, près de la pharmacie"
                      placeholderTextColor="#94A3B8"
                      value={adresseLivraison}
                      onChangeText={setAdresseLivraison}
                    />

                    <View style={styles.totalSummary}>
                      <Text style={styles.totalSummaryLabel}>Montant Total :</Text>
                      <Text style={styles.totalSummaryValue}>
                        {((parseInt(quantite, 10) || 1) * currentUnitPrice).toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>

                    <AnimatedButton style={styles.btnOrange} onPress={handleCreateOrder}>
                      <Text style={styles.btnOrangeText}>Valider la commande</Text>
                    </AnimatedButton>
                  </View>
                )}

                {dashboardTab === 'orders_list' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Suivi des commandes</Text>

                    <View style={styles.filterRow}>
                      <AnimatedButton style={[styles.filterBtn, orderFilter === 'all' && styles.filterBtnActive]} onPress={() => setOrderFilter('all')}>
                        <Text style={[styles.filterText, orderFilter === 'all' && styles.filterTextActive]}>Toutes</Text>
                      </AnimatedButton>
                      <AnimatedButton style={[styles.filterBtn, orderFilter === 'pending' && styles.filterBtnActive]} onPress={() => setOrderFilter('pending')}>
                        <Text style={[styles.filterText, orderFilter === 'pending' && styles.filterTextActive]}>En cours</Text>
                      </AnimatedButton>
                      <AnimatedButton style={[styles.filterBtn, orderFilter === 'delivered' && styles.filterBtnActive]} onPress={() => setOrderFilter('delivered')}>
                        <Text style={[styles.filterText, orderFilter === 'delivered' && styles.filterTextActive]}>Livrées</Text>
                      </AnimatedButton>
                    </View>

                    {commandes.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <View style={styles.emptyIconCircle}>
                          <Text style={styles.emptyIconText}>VIDE</Text>
                        </View>
                        <Text style={styles.emptyTitle}>Aucune commande enregistrée</Text>
                        <Text style={styles.emptySubtitle}>
                          Vos recharges de gaz commandées s'afficheront ici.
                        </Text>
                        <AnimatedButton
                          style={styles.btnOrangeCompact}
                          onPress={() => setDashboardTab('order')}
                        >
                          <Text style={styles.btnOrangeCompactText}>Commander du gaz maintenant</Text>
                        </AnimatedButton>
                      </View>
                    ) : (
                      filteredCommandes.map((cmd) => (
                        <View key={cmd.id} style={styles.orderRow}>
                          <View style={styles.orderRowHeader}>
                            <Text style={styles.orderRowId}>{cmd.id}</Text>
                            <Text style={cmd.codeStatut === 'delivered' ? styles.statusGreen : styles.statusOrange}>{cmd.statut}</Text>
                          </View>
                          <Text style={styles.orderRowBody}>{cmd.qte}x {cmd.type}</Text>
                          <View style={styles.orderRowFooter}>
                            <Text style={styles.orderRowDate}>{cmd.date}</Text>
                            <Text style={styles.orderRowTotal}>{cmd.total}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {dashboardTab === 'add_stock' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Mise à jour des stocks</Text>
                    
                    <Text style={styles.label}>Bouteilles B6 (6 kg)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={stockB6} onChangeText={setStockB6} />
                    
                    <Text style={styles.label}>Bouteilles B12 (12.5 kg)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={stockB12} onChangeText={setStockB12} />
                    
                    <Text style={styles.label}>Bouteilles B28 (28 kg)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={stockB28} onChangeText={setStockB28} />
                    
                    <AnimatedButton style={styles.btnOrange} onPress={() => Alert.alert('Stock enregistré', 'Les quantités ont été mises à jour.')}>
                      <Text style={styles.btnOrangeText}>Enregistrer</Text>
                    </AnimatedButton>
                  </View>
                )}

                {dashboardTab === 'sales_list' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>État actuel du dépôt</Text>
                    <View style={styles.inventoryRow}>
                      <Text style={styles.inventoryLabel}>• Bouteilles B6 :</Text>
                      <Text style={styles.inventoryValue}>{stockB6} disponibles</Text>
                    </View>
                    <View style={styles.inventoryRow}>
                      <Text style={styles.inventoryLabel}>• Bouteilles B12 :</Text>
                      <Text style={styles.inventoryValue}>{stockB12} disponibles</Text>
                    </View>
                    <View style={styles.inventoryRow}>
                      <Text style={styles.inventoryLabel}>• Bouteilles B28 :</Text>
                      <Text style={styles.inventoryValue}>{stockB28} disponibles</Text>
                    </View>
                  </View>
                )}
              </FadeInView>
            )
          ) : (
            <FadeInView key={currentScreen} style={styles.mainWrapper}>
              {currentScreen === 'welcome' && (
                <View style={styles.welcomeContainer}>
                  <View style={styles.heroSection}>
                    <View style={styles.heroBadge}>
                      <Text style={styles.heroBadgeText}>SERVICE RAPIDE & SÉCURISÉ</Text>
                    </View>
                    <Text style={styles.heroTitle}>Distribution & Livraison de Gaz</Text>
                    <Text style={styles.heroSub}>Commandez votre recharge ou gérez votre dépôt en toute simplicité.</Text>
                  </View>

                  <View style={styles.cardsWrapper}>
                    <AnimatedButton style={styles.welcomeCardDark} onPress={() => setCurrentScreen('register_client')}>
                      <Text style={styles.welcomeCardTitleLight}>Espace Client</Text>
                      <Text style={styles.welcomeCardSubLight}>Commandez et faites-vous livrer à domicile</Text>
                    </AnimatedButton>

                    <AnimatedButton style={styles.welcomeCardWhite} onPress={() => setCurrentScreen('register_depot')}>
                      <Text style={styles.welcomeCardTitleDark}>Espace Vendeur</Text>
                      <Text style={styles.welcomeCardSubDark}>Gérez vos stocks et recevez des commandes</Text>
                    </AnimatedButton>
                  </View>

                  <AnimatedButton style={styles.btnNavyOutline} onPress={() => setCurrentScreen('login')}>
                    <Text style={styles.btnNavyOutlineText}>Se connecter</Text>
                  </AnimatedButton>
                </View>
              )}

              {(currentScreen === 'register_client' || currentScreen === 'register_depot') && (
                <View style={styles.cardBox}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={styles.backBtnInline}>
                    <Text style={styles.backBtnInlineText}>Retour</Text>
                  </AnimatedButton>
                  
                  <Text style={styles.cardBoxTitle}>
                    {currentScreen === 'register_depot' ? 'Créer un compte Dépôt' : 'Créer un compte Client'}
                  </Text>

                  <Text style={styles.label}>Nom complet *</Text>
                  <TextInput style={styles.input} placeholder="Ex: Jean Kouassi" placeholderTextColor="#94A3B8" value={nom} onChangeText={setNom} />

                  <Text style={styles.label}>Téléphone *</Text>
                  <TextInput style={styles.input} keyboardType="phone-pad" placeholder="07 00 00 00 00" placeholderTextColor="#94A3B8" value={telephone} onChangeText={setTelephone} />

                  <Text style={styles.label}>Adresse / Quartier</Text>
                  <TextInput style={styles.input} placeholder="Ex: Cocody Angré" placeholderTextColor="#94A3B8" value={adresse} onChangeText={setAdresse} />

                  <Text style={styles.label}>Adresse Email *</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@exemple.com" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe *</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} />

                  <AnimatedButton style={styles.btnOrange} onPress={() => handleRegister(currentScreen === 'register_depot' ? 'depot' : 'client')} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>{currentScreen === 'register_depot' ? 'S\'inscrire (1 Mois Gratuit)' : 'Créer mon compte'}</Text>}
                  </AnimatedButton>
                </View>
              )}

              {currentScreen === 'login' && (
                <View style={styles.cardBox}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={styles.backBtnInline}>
                    <Text style={styles.backBtnInlineText}>Retour</Text>
                  </AnimatedButton>
                  
                  <Text style={styles.cardBoxTitle}>Connexion</Text>

                  <Text style={styles.label}>Adresse Email</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@exemple.com" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} />

                  <AnimatedButton
                    style={{ alignSelf: 'flex-end', marginBottom: 16 }}
                    onPress={() => {
                      setForgotEmail(email);
                      setResetStep(1);
                      setCurrentScreen('forgot_password');
                    }}
                  >
                    <Text style={styles.forgotLinkText}>Mot de passe oublié ?</Text>
                  </AnimatedButton>

                  <AnimatedButton style={styles.btnOrange} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Se connecter</Text>}
                  </AnimatedButton>
                </View>
              )}

              {/* ÉCRAN DE RÉINITIALISATION SÉCURISÉ (3 ÉTAPES SÉPARÉES) */}
              {currentScreen === 'forgot_password' && (
                <View style={styles.cardBox}>
                  <AnimatedButton
                    onPress={() => {
                      if (resetStep === 3) {
                        setResetStep(2);
                      } else if (resetStep === 2) {
                        setResetStep(1);
                      } else {
                        setCurrentScreen('login');
                      }
                    }}
                    style={styles.backBtnInline}
                  >
                    <Text style={styles.backBtnInlineText}>Retour</Text>
                  </AnimatedButton>

                  {resetStep === 1 && (
                    <>
                      <Text style={styles.cardBoxTitle}>Mot de passe oublié</Text>
                      <Text style={styles.label}>Saisissez l'adresse email de votre compte :</Text>
                      <TextInput
                        style={styles.input}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="email@exemple.com"
                        placeholderTextColor="#94A3B8"
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                      />

                      <AnimatedButton style={styles.btnOrange} onPress={handleRequestResetCode} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Envoyer le code (5 chiffres)</Text>}
                      </AnimatedButton>
                    </>
                  )}

                  {resetStep === 2 && (
                    <>
                      <Text style={styles.cardBoxTitle}>Validation du code</Text>
                      <Text style={styles.label}>Entrez le code à 5 chiffres envoyé à {forgotEmail} :</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        maxLength={5}
                        placeholder="Ex: 84920"
                        placeholderTextColor="#94A3B8"
                        value={resetCode}
                        onChangeText={setResetCode}
                        autoComplete="one-time-code"
                        textContentType="oneTimeCode"
                      />

                      <AnimatedButton style={styles.btnOrange} onPress={handleVerifyResetCode} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Confirmer</Text>}
                      </AnimatedButton>
                    </>
                  )}

                  {resetStep === 3 && (
                    <>
                      <Text style={styles.cardBoxTitle}>Nouveau mot de passe</Text>
                      <Text style={styles.label}>Saisissez votre nouveau mot de passe :</Text>
                      <TextInput
                        style={styles.input}
                        secureTextEntry
                        placeholder="••••••••"
                        placeholderTextColor="#94A3B8"
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />

                      <AnimatedButton style={styles.btnOrange} onPress={handleConfirmNewPassword} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Enregistrer</Text>}
                      </AnimatedButton>
                    </>
                  )}
                </View>
              )}
            </FadeInView>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  splashContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 96, height: 96, marginBottom: 16 },
  splashTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 1.2 },
  splashSubTitle: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  
  appBar: { backgroundColor: '#0F172A', paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#F97316' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBadge: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  brandLogoImage: { width: 26, height: 26 },
  brandTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  brandSub: { color: '#94A3B8', fontSize: 9, fontWeight: '700' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  logoutBtnText: { color: '#F87171', fontSize: 12, fontWeight: '700' },
  
  scrollContent: { flexGrow: 1, padding: 16 },
  mainWrapper: { flex: 1, justifyContent: 'space-between' },
  
  trialBannerRow: { backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B', padding: 12, borderRadius: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  trialBannerTitle: { color: '#B45309', fontSize: 13, fontWeight: '800' },
  trialBannerSub: { color: '#D97706', fontSize: 11, marginTop: 2 },
  btnPayNowInline: { backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnPayNowInlineText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  
  pillsContainerOuter: { backgroundColor: '#E2E8F0', borderRadius: 14, padding: 4, marginBottom: 16 },
  pillsScrollContent: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pillBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pillBtnActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pillTextActive: { color: '#0F172A', fontWeight: '800' },
  
  userGreetingCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  greetingTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  greetingSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  kpiCardTag: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  kpiCardNum: { fontSize: 18, fontWeight: '900', color: '#F97316', marginTop: 4 },
  
  actionCardOrange: { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#F97316', borderRadius: 14, padding: 16 },
  actionCardTitle: { fontSize: 15, fontWeight: '800', color: '#C2410C' },
  actionCardSub: { fontSize: 12, color: '#EA580C', marginTop: 4 },
  actionCardNavy: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16 },
  actionCardTitleWhite: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  actionCardSubWhite: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  
  cardBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  cardBoxTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  subTitleCenter: { textAlign: 'center', color: '#64748B', fontSize: 13, marginBottom: 16 },
  backBtnInline: { marginBottom: 12 },
  backBtnInlineText: { color: '#F97316', fontWeight: '800', fontSize: 13 },
  
  searchBoxContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, marginBottom: 14 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  depotCard: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, marginBottom: 12 },
  depotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  depotTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  depotSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  depotDistance: { color: '#F97316', fontWeight: '800' },
  depotStatusBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  depotStatusText: { color: '#15803D', fontSize: 11, fontWeight: '800' },
  stockChipsRow: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  stockChip: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 8, borderRadius: 8, alignItems: 'center' },
  stockChipLabel: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  stockChipVal: { fontSize: 11, color: '#16A34A', fontWeight: '800', marginTop: 2 },
  stockChipValEmpty: { fontSize: 11, color: '#DC2626', fontWeight: '800', marginTop: 2 },
  btnDepotSelect: { backgroundColor: '#0F172A', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnDepotSelectText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  
  cylinderList: { gap: 10, marginBottom: 16 },
  cylinderItem: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  cylinderItemActive: { backgroundColor: '#FFF7ED', borderColor: '#F97316' },
  cylinderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cylinderTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  cylinderPrice: { fontSize: 14, fontWeight: '800', color: '#F97316' },
  
  colorBadge: { width: 12, height: 12, borderRadius: 6 },
  colorBadgeLarge: { width: 16, height: 16, borderRadius: 8 },
  marqueChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  marqueChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  
  marqueCardGrid: { width: 100, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, padding: 10, alignItems: 'center' },
  bottleVisualCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  marqueCardTitle: { fontSize: 11, fontWeight: '700', color: '#334155', textAlign: 'center' },
  marqueCardColor: { fontSize: 9, color: '#94A3B8', textAlign: 'center', marginTop: 2 },

  opTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  opTypeBtnActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  opTypeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  opTypeTextActive: { color: '#FFFFFF' },

  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, padding: 4, width: 140, justifyContent: 'space-between', marginBottom: 16 },
  stepperBtn: { width: 36, height: 36, backgroundColor: '#0F172A', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  stepperBtnDisabled: { backgroundColor: '#CBD5E1' },
  stepperBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  stepperValueBox: { flex: 1, alignItems: 'center' },
  stepperValueText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A', marginBottom: 14 },
  forgotLinkText: { color: '#F97316', fontSize: 12, fontWeight: '800' },
  totalSummary: { backgroundColor: '#0F172A', padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  totalSummaryLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  totalSummaryValue: { color: '#F97316', fontSize: 18, fontWeight: '900' },
  btnOrange: { backgroundColor: '#F97316', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnOrangeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  btnNavyPdf: { backgroundColor: '#0F172A', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnNavyPdfText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  
  dateOffsetBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  dateOffsetBtnActive: { backgroundColor: '#F97316' },
  dateOffsetText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  dateOffsetTextActive: { color: '#FFFFFF' },
  
  smallCylBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  smallCylBtnActive: { backgroundColor: '#FFF7ED', borderColor: '#F97316' },
  smallCylText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  smallCylTextActive: { color: '#C2410C', fontWeight: '800' },
  
  saleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  saleClient: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  saleType: { fontSize: 11, color: '#64748B', marginTop: 2 },
  saleTotal: { fontSize: 13, fontWeight: '800', color: '#16A34A' },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
  filterBtnActive: { backgroundColor: '#0F172A' },
  filterText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterTextActive: { color: '#FFFFFF' },
  orderRow: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginBottom: 10 },
  orderRowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderRowId: { fontWeight: '800', color: '#0F172A' },
  statusOrange: { color: '#D97706', fontWeight: '800', fontSize: 11 },
  statusGreen: { color: '#16A34A', fontWeight: '800', fontSize: 11 },
  orderRowBody: { fontSize: 13, color: '#334155', marginVertical: 4 },
  orderRowFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  orderRowDate: { fontSize: 11, color: '#94A3B8' },
  orderRowTotal: { color: '#F97316', fontWeight: '800' },
  
  emptyCard: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyIconText: { fontSize: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  btnOrangeCompact: { backgroundColor: '#F97316', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnOrangeCompactText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  
  subCard: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#F97316', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16 },
  subCardBadge: { backgroundColor: '#FFF7ED', color: '#C2410C', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 6 },
  subCardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  subCardPrice: { fontSize: 22, fontWeight: '900', color: '#F97316', marginTop: 4 },
  subCardMonth: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  paymentMethodsGrid: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  paymentBtn: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', padding: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  paymentLogoImage: { width: 28, height: 24 },
  paymentBtnText: { fontSize: 9, fontWeight: '700', color: '#64748B', marginTop: 4, textAlign: 'center' },
  
  inventoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  inventoryLabel: { fontSize: 14, color: '#334155', fontWeight: '600' },
  inventoryValue: { fontSize: 14, color: '#F97316', fontWeight: '800' },
  
  welcomeContainer: { flex: 1, justifyContent: 'space-between' },
  heroSection: { marginVertical: 12 },
  heroBadge: { backgroundColor: '#FFF7ED', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 10 },
  heroBadgeText: { color: '#C2410C', fontSize: 10, fontWeight: '800' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#0F172A', lineHeight: 32 },
  heroSub: { fontSize: 13, color: '#64748B', marginTop: 6 },
  cardsWrapper: { gap: 12, marginVertical: 12 },
  welcomeCardDark: { backgroundColor: '#0F172A', borderRadius: 16, padding: 18 },
  welcomeCardWhite: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  welcomeCardTitleLight: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  welcomeCardSubLight: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  welcomeCardTitleDark: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  welcomeCardSubDark: { color: '#64748B', fontSize: 12, marginTop: 4 },
  btnNavyOutline: { borderWidth: 1.5, borderColor: '#0F172A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnNavyOutlineText: { color: '#0F172A', fontWeight: '800', fontSize: 14 }
});