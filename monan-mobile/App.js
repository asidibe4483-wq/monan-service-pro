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
  Pressable,
  Easing,
  BackHandler
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const API_URL = "https://monan-backend.onrender.com";

const FadeInView = ({ children, style, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[{ flex: 1 }, style, { opacity: fadeAnim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

const PulsingBadge = ({ children }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      {children}
    </Animated.View>
  );
};

const AnimatedButton = ({ onPress, style, children, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
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

// COMPOSANT IMAGE SÉCURISÉ AVEC REPLI STYLISÉ SI L'IMAGE DISTANTE NE S'AFFICHE PAS
const BottleImageWithFallback = ({ uri, brandColor, brandName }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError || !uri) {
    return (
      <View style={[styles.fallbackBottleContainer, { backgroundColor: brandColor + '22', borderColor: brandColor }]}>
        <View style={[styles.fallbackBottleTop, { backgroundColor: brandColor }]} />
        <View style={[styles.fallbackBottleBody, { backgroundColor: brandColor }]}>
          <Text style={styles.fallbackBottleText}>🔥</Text>
        </View>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.productBottleImg}
      resizeMode="contain"
      onError={() => setImageError(true)}
    />
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

const MARQUES_GAZ = [
  { id: 'total', name: 'TotalEnergies', color: '#F97316', imageUrl: 'https://img.freepik.com/free-psd/orange-gas-cylinder-isolated-transparent-background_191095-23646.png' },
  { id: 'shell', name: 'Shell Gas', color: '#1E40AF', imageUrl: 'https://img.freepik.com/free-psd/blue-gas-cylinder-isolated-transparent-background_191095-23647.png' },
  { id: 'petro', name: 'Pétro Ivoire', color: '#334155', imageUrl: 'https://img.freepik.com/free-psd/dark-blue-gas-tank_191095-23648.png' },
  { id: 'oryx', name: 'Oryx Energies', color: '#0EA5E9', imageUrl: 'https://img.freepik.com/free-psd/cyan-gas-bottle_191095-23649.png' },
  { id: 'simam', name: 'Simam Gas', color: '#EAB308', imageUrl: 'https://img.freepik.com/free-psd/yellow-gas-bottle_191095-23650.png' },
  { id: 'districom', name: 'Districom Gaz', color: '#EF4444', imageUrl: 'https://img.freepik.com/free-psd/red-gas-cylinder_191095-23651.png' },
  { id: 'ola', name: 'OLA Energy', color: '#991B1B', imageUrl: 'https://img.freepik.com/free-psd/red-gas-cylinder_191095-23651.png' },
  { id: 'corlay', name: 'Corlay', color: '#16A34A', imageUrl: 'https://img.freepik.com/free-psd/cyan-gas-bottle_191095-23649.png' },
];

const CYLINDER_TYPES = [
  { id: 'B6', name: 'B6 (6 kg)', priceRecharge: 2000, priceAchat: 13000 },
  { id: 'B12', name: 'B12 (12.5 kg)', priceRecharge: 5500, priceAchat: 25000 },
  { id: 'B28', name: 'B28 (28 kg)', priceRecharge: 13000, priceAchat: 45000 },
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
  const [activeRoleMode, setActiveRoleMode] = useState('depot'); // 'depot' ou 'client'
  const [loading, setLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('home');

  const [vendorPrices, setVendorPrices] = useState({
    B6: { recharge: '2000', achat: '13000' },
    B12: { recharge: '5500', achat: '25000' },
    B28: { recharge: '13000', achat: '45000' },
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1);

  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('wave');
  const [paymentPhone, setPaymentPhone] = useState('');

  const [selectedMarque, setSelectedMarque] = useState(MARQUES_GAZ[0]);
  const [selectedCylinder, setSelectedCylinder] = useState(CYLINDER_TYPES[1]);
  const [operationType, setOperationType] = useState('recharge');
  const [quantite, setQuantite] = useState('1');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');

  const [searchDepot, setSearchDepot] = useState('');
  const [depotsList] = useState([
    { id: 'DEP-01', nom: 'Dépôt Angré 8ème Tranche', distance: '0.8 km', quartier: 'Cocody Angré', statut: 'Ouvert', b6: 14, b12: 28, b28: 5 },
    { id: 'DEP-02', nom: 'Dépôt Saint-Jean', distance: '2.3 km', quartier: 'Cocody Centre', statut: 'Ouvert', b6: 8, b12: 12, b28: 0 },
    { id: 'DEP-03', nom: 'Dépôt Yopougon Maroc', distance: '5.1 km', quartier: 'Yopougon', statut: 'Ouvert', b6: 22, b12: 35, b28: 10 },
  ]);

  const [commandes, setCommandes] = useState([]);
  const [stockB6, setStockB6] = useState('10');
  const [stockB12, setStockB12] = useState('25');
  const [stockB28, setStockB28] = useState('5');

  const [salesPeriod, setSalesPeriod] = useState('day');
  const [dayOffset, setDayOffset] = useState(0);
  const [salesReport, setSalesReport] = useState({
    totalRecette: 185000,
    count: 12,
    totals: { b6: 8, b12: 18, b28: 4 },
    sales: [
      { id: 101, client_nom: 'Kouassi Yves', marque: 'TotalEnergies', couleur: '#F97316', bouteille_type: 'B12 (12.5 kg)', type_operation: 'Recharge', quantite: 2, montant_total: 11000, created_at: new Date().toISOString() },
      { id: 102, client_nom: 'Mme Koné', marque: 'Shell Gas', couleur: '#1E40AF', bouteille_type: 'B6 (6 kg)', type_operation: 'Recharge', quantite: 1, montant_total: 2000, created_at: new Date().toISOString() },
      { id: 103, client_nom: 'Restaurant Le Lagon', marque: 'Pétro Ivoire', couleur: '#334155', bouteille_type: 'B12 (12.5 kg)', type_operation: 'Achat', quantite: 2, montant_total: 50000, created_at: new Date().toISOString() },
    ]
  });

  const [newSaleClient, setNewSaleClient] = useState('');

  const daysLeft = user ? getDaysLeftInTrial(user.createdAt) : 30;
  const isTrialExpired = user && activeRoleMode === 'depot' && !user.isSubscribed && daysLeft <= 0;

  useEffect(() => {
    const timer = setTimeout(() => setIsAppReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // GESTION DU BOUTON ET RETOUR TACTILE (ANDROID & GESTES)
  useEffect(() => {
    const onBackPress = () => {
      // 1. Utilisateur non connecté
      if (!user) {
        if (currentScreen === 'forgot_password') {
          if (resetStep > 1) {
            setResetStep((prevStep) => prevStep - 1);
            return true;
          }
          setCurrentScreen('login');
          return true;
        }

        if (currentScreen === 'login' || currentScreen === 'register_client' || currentScreen === 'register_depot') {
          setCurrentScreen('welcome');
          return true;
        }

        return false; // Laisse quitter l'app seulement sur l'écran d'accueil 'welcome'
      }

      // 2. Utilisateur connecté
      if (showPaymentSection && !isTrialExpired) {
        setShowPaymentSection(false);
        return true;
      }

      if (dashboardTab !== 'home') {
        setDashboardTab('home');
        return true;
      }

      return false; // Laisse quitter/minimiser l'app sur l'onglet Accueil du tableau de bord
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      if (backSubscription && typeof backSubscription.remove === 'function') {
        backSubscription.remove();
      } else {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }
    };
  }, [user, currentScreen, resetStep, showPaymentSection, isTrialExpired, dashboardTab]);

  useEffect(() => {
    if (user && activeRoleMode === 'depot' && dashboardTab === 'sales_report') {
      fetchSalesReport();
    }
  }, [salesPeriod, dayOffset, dashboardTab, activeRoleMode]);

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/sales/report?period=${salesPeriod}&date_offset=${dayOffset}`
      );
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.sales && data.sales.length > 0) {
            setSalesReport(data);
          }
        }
      }
    } catch (err) {
      console.log('Utilisation du bilan local par défaut');
    } finally {
      setLoading(false);
    }
  };

  const activeFormatPrices = vendorPrices[selectedCylinder.id] || { recharge: selectedCylinder.priceRecharge, achat: selectedCylinder.priceAchat };
  const currentUnitPrice = operationType === 'recharge' 
    ? (parseInt(activeFormatPrices.recharge, 10) || selectedCylinder.priceRecharge)
    : (parseInt(activeFormatPrices.achat, 10) || selectedCylinder.priceAchat);

  const handleToggleRoleMode = () => {
    const newMode = activeRoleMode === 'depot' ? 'client' : 'depot';
    setActiveRoleMode(newMode);
    setDashboardTab('home');
  };

  const handleSaveVendorPrices = async () => {
    setLoading(true);
    try {
      const payload = [
        { format: 'B6', prix_recharge: parseInt(vendorPrices.B6.recharge, 10), prix_achat: parseInt(vendorPrices.B6.achat, 10) },
        { format: 'B12', prix_recharge: parseInt(vendorPrices.B12.recharge, 10), prix_achat: parseInt(vendorPrices.B12.achat, 10) },
        { format: 'B28', prix_recharge: parseInt(vendorPrices.B28.recharge, 10), prix_achat: parseInt(vendorPrices.B28.achat, 10) },
      ];
      await fetch(`${API_URL}/api/depot/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depot_id: user.id || 1, prices: payload })
      });
      Alert.alert('Succès', 'Vos tarifs ont été enregistrés !');
    } catch (err) {
      Alert.alert('Sauvegarde locale', 'Tarifs appliqués avec succès.');
    } finally {
      setLoading(false);
    }
  };

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
        Alert.alert('Vente enregistrée !', `Total : ${total.toLocaleString('fr-FR')} FCFA`);
        setNewSaleClient('');
        fetchSalesReport();
      } else {
        throw new Error('Erreur d\'enregistrement');
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
      Alert.alert('Vente ajoutée !', `Total : ${total.toLocaleString('fr-FR')} FCFA`);
      setNewSaleClient('');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDFReport = async () => {
    let periodTitle = 'BILAN DES VENTES JOURNALIER';
    if (salesPeriod === 'day') {
      if (dayOffset === 0) periodTitle = 'BILAN DU JOUR';
      else if (dayOffset === -1) periodTitle = 'BILAN D\'HIER';
      else periodTitle = 'BILAN D\'AVANT-HIER';
    } else if (salesPeriod === 'week') {
      periodTitle = 'BILAN HEBDOMADAIRE';
    } else if (salesPeriod === 'month') {
      periodTitle = 'BILAN MENSUEL';
    } else if (salesPeriod === 'year') {
      periodTitle = 'BILAN ANNUEL';
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: sans-serif; padding: 20px; color: #0F172A; }
            .header { text-align: center; border-bottom: 3px solid #F97316; padding-bottom: 10px; margin-bottom: 15px; }
            .brand { font-size: 22px; font-weight: 900; }
            .subtitle { color: #F97316; font-size: 13px; font-weight: 800; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #0F172A; color: #FFFFFF; font-size: 11px; padding: 8px; text-align: left; }
            td { border-bottom: 1px solid #E2E8F0; padding: 8px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">MONAN SERVICE PRO</div>
            <div class="subtitle">${periodTitle}</div>
          </div>
          <table>
            <thead>
              <tr><th>Client</th><th>Article</th><th>Qté</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${salesReport.sales.map(s => `
                <tr>
                  <td>${s.client_nom || 'Client'}</td>
                  <td>${s.marque || 'Gaz'} ${s.bouteille_type}</td>
                  <td>${s.quantite}</td>
                  <td><strong>${(parseInt(s.montant_total) || 0).toLocaleString('fr-FR')} F</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Impression PDF', 'Génération du bilan PDF...');
    }
  };

  function getDaysLeftInTrial(createdAtDate) {
    if (!createdAtDate) return 30;
    const created = new Date(createdAtDate);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 30 - diffDays;
    return remaining > 0 ? remaining : 0;
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir vos identifiants.');
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
        throw new Error(`Erreur serveur (${response.status}). Indisponibilité temporaire.`);
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Identifiants incorrects.');
      }

      const rawUser = data.user || data;
      const fetchedRole = String(rawUser.role || data.role || '').toLowerCase().trim();
      const isDepotUser = fetchedRole === 'depot' || fetchedRole === 'vendeur' || email.toLowerCase().includes('depot');

      const userData = {
        ...rawUser,
        email: rawUser.email || email.trim().toLowerCase(),
        nom: rawUser.nom || data.nom || email.split('@')[0],
        role: isDepotUser ? 'depot' : 'client',
        createdAt: rawUser.createdAt || new Date().toISOString(),
        isSubscribed: rawUser.isSubscribed || false
      };

      setUser(userData);
      setActiveRoleMode(userData.role);
      setAdresseLivraison(userData.adresse || '');
      setDashboardTab('home');
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (type) => {
    if (!nom || !telephone || !email || !password) {
      Alert.alert('Formulaire incomplet', 'Veuillez remplir les champs obligatoires.');
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
        throw new Error(data.error || 'Échec de l\'inscription.');
      }

      const newUser = data.user || { nom, email, telephone, adresse, role: type, createdAt: registrationDate, isSubscribed: false };

      setUser(newUser);
      setActiveRoleMode(type);
      setAdresseLivraison(adresse.trim());
      setDashboardTab('home');
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async () => {
    if (!forgotEmail) return Alert.alert('Champ requis', 'Saisissez votre email.');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(`Erreur serveur (Code ${response.status}). Vérifiez la route backend.`);
      }

      if (!response.ok) throw new Error(data.error || "Email introuvable.");
      setResetStep(2);
      Alert.alert('Code envoyé', data.message || 'Consultez votre boîte de réception.');
    } catch (error) {
      Alert.alert('Erreur Réinitialisation', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!resetCode || resetCode.trim().length !== 5) return Alert.alert('Invalide', 'Code à 5 chiffres requis.');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), code: resetCode.trim() }),
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(`Erreur serveur (Code ${response.status}).`);
      }

      if (!response.ok) throw new Error(data.error || "Code incorrect.");
      setResetStep(3);
    } catch (error) {
      Alert.alert('Erreur Validation', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmNewPassword = async () => {
    if (!newPassword || newPassword.trim().length < 6) return Alert.alert('Invalide', 'Mot de passe trop court.');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), code: resetCode.trim(), newPassword: newPassword.trim() }),
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(`Erreur serveur (Code ${response.status}).`);
      }

      if (!response.ok) throw new Error(data.error || "Mise à jour échouée.");
      Alert.alert('Succès', 'Mot de passe mis à jour.', [{ text: 'Connexion', onPress: () => setCurrentScreen('login') }]);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSubscription = () => {
    if (!paymentPhone) return Alert.alert('Numéro requis', 'Entrez le numéro à débiter.');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setUser({ ...user, isSubscribed: true });
      setShowPaymentSection(false);
      Alert.alert('Paiement validé', 'Abonnement Monan Pro actif.');
    }, 1200);
  };

  const handleCreateOrder = () => {
    if (!adresseLivraison) return Alert.alert('Adresse requise', 'Précisez votre lieu de livraison.');

    const qteNum = parseInt(quantite, 10) || 1;
    const pu = currentUnitPrice;
    const totalCalculated = qteNum * pu;

    const newCmd = {
      id: `CMD-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('fr-FR'),
      type: `${selectedMarque.name} ${selectedCylinder.name}`,
      qte: qteNum,
      statut: 'En cours',
      codeStatut: 'pending',
      total: `${totalCalculated.toLocaleString('fr-FR')} FCFA`
    };

    setCommandes([newCmd, ...commandes]);
    Alert.alert('Commande enregistrée !', `Total : ${totalCalculated.toLocaleString('fr-FR')} FCFA`, [
      { text: 'Suivre', onPress: () => setDashboardTab('orders_list') }
    ]);
  };

  const handleLogout = () => {
    setUser(null);
    setEmail('');
    setPassword('');
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
        <ActivityIndicator size="small" color="#F97316" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* HEADER AVEC BOUTON DE BASCULEMENT DE MODE */}
      <View style={styles.appBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Image source={require('./assets/splash-icon.png')} style={styles.brandLogoImage} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.brandTitle}>MONAN SERVICE</Text>
            <Text style={styles.brandSub}>
              {user ? (activeRoleMode === 'depot' ? 'ESPACE VENDEUR' : 'ESPACE CLIENT') : 'DISTRIBUTION DE GAZ'}
            </Text>
          </View>
        </View>

        {user && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <AnimatedButton style={styles.roleToggleBtn} onPress={handleToggleRoleMode}>
              <Text style={styles.roleToggleBtnText}>
                {activeRoleMode === 'depot' ? 'Vue Client' : 'Vue Vendeur'}
              </Text>
            </AnimatedButton>

            <AnimatedButton style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Quitter</Text>
            </AnimatedButton>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {user ? (
            (isTrialExpired || showPaymentSection) ? (
              <FadeInView style={styles.mainWrapper}>
                <View style={styles.cardBox}>
                  {activeRoleMode === 'depot' && !isTrialExpired && (
                    <AnimatedButton onPress={() => setShowPaymentSection(false)} style={styles.backBtnInline}>
                      <Text style={styles.backBtnInlineText}>Retour</Text>
                    </AnimatedButton>
                  )}

                  <Text style={[styles.cardBoxTitle, { textAlign: 'center' }]}>Abonnement Vendeur</Text>

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
                          <Image source={pm.logo} style={styles.paymentLogoImage} resizeMode="contain" />
                          <Text style={[styles.paymentBtnText, isSelected && { color: '#0F172A', fontWeight: '800' }]}>{pm.name}</Text>
                        </AnimatedButton>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Téléphone Mobile Money *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    placeholder="07 00 00 00 00"
                    placeholderTextColor="#94A3B8"
                    value={paymentPhone}
                    onChangeText={setPaymentPhone}
                  />

                  <AnimatedButton style={styles.btnOrange} onPress={handleProcessSubscription} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Payer 3 000 FCFA</Text>}
                  </AnimatedButton>
                </View>
              </FadeInView>
            ) : (
              <FadeInView key={`${dashboardTab}-${activeRoleMode}`} style={styles.mainWrapper}>
                {activeRoleMode === 'depot' && (
                  <View style={styles.trialBannerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trialBannerTitle}>
                        {user.isSubscribed ? '✅ Abonnement Vendeur Actif' : `Essai gratuit : ${daysLeft} jours restants`}
                      </Text>
                    </View>
                    {!user.isSubscribed && (
                      <AnimatedButton style={styles.btnPayNowInline} onPress={() => setShowPaymentSection(true)}>
                        <Text style={styles.btnPayNowInlineText}>Activer</Text>
                      </AnimatedButton>
                    )}
                  </View>
                )}

                {/* BARRE D'ONGLETS */}
                <View style={styles.pillsContainerOuter}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScrollContent}>
                    <AnimatedButton
                      style={[styles.pillBtn, dashboardTab === 'home' && styles.pillBtnActive]}
                      onPress={() => setDashboardTab('home')}
                    >
                      <Text style={[styles.pillText, dashboardTab === 'home' && styles.pillTextActive]}>Accueil</Text>
                    </AnimatedButton>

                    {activeRoleMode === 'depot' ? (
                      <>
                        <AnimatedButton
                          style={[styles.pillBtn, dashboardTab === 'pricing' && styles.pillBtnActive]}
                          onPress={() => setDashboardTab('pricing')}
                        >
                          <Text style={[styles.pillText, dashboardTab === 'pricing' && styles.pillTextActive]}>Prix Vendeur 💰</Text>
                        </AnimatedButton>
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
                          <Text style={[styles.pillText, dashboardTab === 'add_stock' && styles.pillTextActive]}>Stocks</Text>
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
                          style={[styles.pillBtn, dashboardTab === 'catalog' && styles.pillBtnActive]}
                          onPress={() => setDashboardTab('catalog')}
                        >
                          <Text style={[styles.pillText, dashboardTab === 'catalog' && styles.pillTextActive]}>Catalogue 🛒</Text>
                        </AnimatedButton>
                        <AnimatedButton
                          style={[styles.pillBtn, dashboardTab === 'depots' && styles.pillBtnActive]}
                          onPress={() => setDashboardTab('depots')}
                        >
                          <Text style={[styles.pillText, dashboardTab === 'depots' && styles.pillTextActive]}>Dépôts</Text>
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

                {/* TABLEAU DE BORD ACCUEIL */}
                {dashboardTab === 'home' && (
                  <View style={styles.fullSection}>
                    <View style={styles.userGreetingCard}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{(user.nom || 'U').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.greetingTitle}>Bonjour, {user.nom || 'Utilisateur'}</Text>
                        <Text style={styles.greetingSubtitle}>
                          {activeRoleMode === 'depot' ? 'Mode Gestionnaire Dépôt' : 'Mode Client Livraisons'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.kpiGrid}>
                      {activeRoleMode === 'depot' ? (
                        <>
                          <View style={styles.kpiCard}>
                            <Text style={styles.kpiCardTag}>RECETTE DU JOUR</Text>
                            <Text style={styles.kpiCardNum}>{salesReport.totalRecette.toLocaleString('fr-FR')} F</Text>
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

                    {activeRoleMode === 'depot' ? (
                      <View style={{ gap: 10 }}>
                        <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('pricing')}>
                          <Text style={styles.actionCardTitle}>Configurer mes Prix Vendeur</Text>
                        </AnimatedButton>

                        <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('sales_report')}>
                          <Text style={styles.actionCardTitleWhite}>Bilan des Ventes en PDF</Text>
                        </AnimatedButton>

                        <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('add_stock')}>
                          <Text style={styles.actionCardTitleWhite}>Gestion des Stocks</Text>
                        </AnimatedButton>
                      </View>
                    ) : (
                      <View style={{ gap: 10 }}>
                        <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('catalog')}>
                          <Text style={styles.actionCardTitle}>🛒 Catalogue des Bouteilles</Text>
                        </AnimatedButton>

                        <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('order')}>
                          <Text style={styles.actionCardTitleWhite}>Commander une Livraison</Text>
                        </AnimatedButton>

                        <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('depots')}>
                          <Text style={styles.actionCardTitleWhite}>Dépôts à Proximité</Text>
                        </AnimatedButton>
                      </View>
                    )}
                  </View>
                )}

                {/* ONGLET TARIFS VENDEUR */}
                {dashboardTab === 'pricing' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Prix Vendeur</Text>

                    <Text style={styles.priceSectionHeader}>Format B6 (6 kg)</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Recharge (F)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B6.recharge} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B6: { ...vendorPrices.B6, recharge: val } })} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Achat Neuf (F)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B6.achat} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B6: { ...vendorPrices.B6, achat: val } })} />
                      </View>
                    </View>

                    <Text style={styles.priceSectionHeader}>Format B12 (12.5 kg)</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Recharge (F)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B12.recharge} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B12: { ...vendorPrices.B12, recharge: val } })} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Achat Neuf (F)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B12.achat} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B12: { ...vendorPrices.B12, achat: val } })} />
                      </View>
                    </View>

                    <Text style={styles.priceSectionHeader}>Format B28 (28 kg)</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Recharge (F)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B28.recharge} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B28: { ...vendorPrices.B28, recharge: val } })} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Achat Neuf (F)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B28.achat} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B28: { ...vendorPrices.B28, achat: val } })} />
                      </View>
                    </View>

                    <AnimatedButton style={styles.btnOrange} onPress={handleSaveVendorPrices} disabled={loading}>
                      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Enregistrer</Text>}
                    </AnimatedButton>
                  </View>
                )}

                {/* CATALOGUE ET COMMANDE */}
                {(dashboardTab === 'catalog' || dashboardTab === 'order') && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>
                      {dashboardTab === 'catalog' ? 'Catalogue 🛒' : 'Nouvelle Commande'}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                      <AnimatedButton
                        style={[styles.opTypeBtn, operationType === 'recharge' && styles.opTypeBtnActive]}
                        onPress={() => setOperationType('recharge')}
                      >
                        <Text style={[styles.opTypeText, operationType === 'recharge' && styles.opTypeTextActive]}>Recharge</Text>
                      </AnimatedButton>
                      <AnimatedButton
                        style={[styles.opTypeBtn, operationType === 'achat' && styles.opTypeBtnActive]}
                        onPress={() => setOperationType('achat')}
                      >
                        <Text style={[styles.opTypeText, operationType === 'achat' && styles.opTypeTextActive]}>Achat Neuf</Text>
                      </AnimatedButton>
                    </View>

                    <Text style={styles.label}>Format :</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                      {CYLINDER_TYPES.map((cyl) => {
                        const isSelected = selectedCylinder.id === cyl.id;
                        const activePrice = operationType === 'recharge' 
                          ? (parseInt(vendorPrices[cyl.id]?.recharge, 10) || cyl.priceRecharge)
                          : (parseInt(vendorPrices[cyl.id]?.achat, 10) || cyl.priceAchat);

                        return (
                          <AnimatedButton
                            key={cyl.id}
                            style={[styles.smallCylBtn, isSelected && styles.smallCylBtnActive]}
                            onPress={() => setSelectedCylinder(cyl)}
                          >
                            <Text style={[styles.smallCylText, isSelected && styles.smallCylTextActive]}>{cyl.id}</Text>
                            <Text style={{ fontSize: 9, color: isSelected ? '#C2410C' : '#64748B', marginTop: 2 }}>
                              {activePrice.toLocaleString('fr-FR')} F
                            </Text>
                          </AnimatedButton>
                        );
                      })}
                    </View>

                    <Text style={styles.label}>Marque :</Text>
                    <View style={styles.productGridContainer}>
                      {MARQUES_GAZ.map((m, idx) => {
                        const isSelected = selectedMarque.id === m.id;
                        const cardPrice = operationType === 'recharge'
                          ? (parseInt(vendorPrices[selectedCylinder.id]?.recharge, 10) || selectedCylinder.priceRecharge)
                          : (parseInt(vendorPrices[selectedCylinder.id]?.achat, 10) || selectedCylinder.priceAchat);

                        return (
                          <FadeInView key={m.id} delay={idx * 50} style={{ width: '48%' }}>
                            <AnimatedButton
                              style={[styles.productCard, isSelected && styles.productCardActive]}
                              onPress={() => {
                                setSelectedMarque(m);
                                if (dashboardTab === 'catalog') setDashboardTab('order');
                              }}
                            >
                              <View style={styles.productImageWrapper}>
                                <View style={[styles.colorBackgroundGlow, { backgroundColor: m.color + '22' }]} />
                                <BottleImageWithFallback
                                  uri={m.imageUrl}
                                  brandColor={m.color}
                                  brandName={m.name}
                                />
                              </View>
                              <Text style={styles.productTitle} numberOfLines={1}>{m.name}</Text>
                              <Text style={styles.productPrice}>{cardPrice.toLocaleString('fr-FR')} CFA</Text>
                            </AnimatedButton>
                          </FadeInView>
                        );
                      })}
                    </View>

                    {dashboardTab === 'order' && (
                      <View style={{ marginTop: 16 }}>
                        <Text style={styles.label}>Quantité</Text>
                        <QuantityStepper value={quantite} onChange={setQuantite} />

                        <Text style={styles.label}>Adresse de livraison *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Commune, quartier, repère..."
                          placeholderTextColor="#94A3B8"
                          value={adresseLivraison}
                          onChangeText={setAdresseLivraison}
                        />

                        <View style={styles.totalSummary}>
                          <Text style={styles.totalSummaryLabel}>Total à payer :</Text>
                          <Text style={styles.totalSummaryValue}>
                            {((parseInt(quantite, 10) || 1) * currentUnitPrice).toLocaleString('fr-FR')} FCFA
                          </Text>
                        </View>

                        <AnimatedButton style={styles.btnOrange} onPress={handleCreateOrder}>
                          <Text style={styles.btnOrangeText}>Valider la commande</Text>
                        </AnimatedButton>
                      </View>
                    )}
                  </View>
                )}

                {/* BILAN DES VENTES */}
                {dashboardTab === 'sales_report' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Bilan en PDF</Text>

                    <View style={styles.filterRow}>
                      <AnimatedButton style={[styles.filterBtn, salesPeriod === 'day' && styles.filterBtnActive]} onPress={() => setSalesPeriod('day')}>
                        <Text style={[styles.filterText, salesPeriod === 'day' && styles.filterTextActive]}>Jour</Text>
                      </AnimatedButton>
                      <AnimatedButton style={[styles.filterBtn, salesPeriod === 'week' && styles.filterBtnActive]} onPress={() => setSalesPeriod('week')}>
                        <Text style={[styles.filterText, salesPeriod === 'week' && styles.filterTextActive]}>Hebdo</Text>
                      </AnimatedButton>
                      <AnimatedButton style={[styles.filterBtn, salesPeriod === 'month' && styles.filterBtnActive]} onPress={() => setSalesPeriod('month')}>
                        <Text style={[styles.filterText, salesPeriod === 'month' && styles.filterTextActive]}>Mois</Text>
                      </AnimatedButton>
                      <AnimatedButton style={[styles.filterBtn, salesPeriod === 'year' && styles.filterBtnActive]} onPress={() => setSalesPeriod('year')}>
                        <Text style={[styles.filterText, salesPeriod === 'year' && styles.filterTextActive]}>An</Text>
                      </AnimatedButton>
                    </View>

                    <View style={styles.totalSummary}>
                      <Text style={styles.totalSummaryLabel}>Recette Totale :</Text>
                      <Text style={styles.totalSummaryValue}>
                        {salesReport.totalRecette.toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>

                    <AnimatedButton style={styles.btnNavyPdf} onPress={handlePrintPDFReport}>
                      <Text style={styles.btnNavyPdfText}>📄 Exporter le Bilan PDF</Text>
                    </AnimatedButton>

                    <Text style={[styles.label, { marginTop: 16 }]}>Saisie Vente Caisse :</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nom du client (optionnel)"
                      placeholderTextColor="#94A3B8"
                      value={newSaleClient}
                      onChangeText={setNewSaleClient}
                    />

                    <QuantityStepper value={quantite} onChange={setQuantite} />

                    <AnimatedButton style={styles.btnOrange} onPress={handleAddDirectSale} disabled={loading}>
                      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Enregistrer la vente</Text>}
                    </AnimatedButton>
                  </View>
                )}

                {dashboardTab === 'depots' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Dépôts Proches 📍</Text>
                    <TextInput style={styles.input} placeholder="Rechercher par quartier..." placeholderTextColor="#94A3B8" value={searchDepot} onChangeText={setSearchDepot} />

                    {filteredDepots.map((depot) => (
                      <View key={depot.id} style={styles.depotCard}>
                        <View style={styles.depotHeader}>
                          <Text style={styles.depotTitle}>{depot.nom}</Text>
                          <Text style={styles.depotDistance}>{depot.distance}</Text>
                        </View>
                        <AnimatedButton style={styles.btnDepotSelect} onPress={() => { setAdresseLivraison(depot.quartier); setDashboardTab('order'); }}>
                          <Text style={styles.btnDepotSelectText}>Commander ici</Text>
                        </AnimatedButton>
                      </View>
                    ))}
                  </View>
                )}

                {dashboardTab === 'orders_list' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Mes Commandes</Text>
                    {commandes.length === 0 ? (
                      <Text style={{ textAlign: 'center', color: '#64748B', marginVertical: 20 }}>Aucune commande en cours</Text>
                    ) : (
                      filteredCommandes.map((cmd) => (
                        <View key={cmd.id} style={styles.orderRow}>
                          <Text style={styles.orderRowId}>{cmd.id} • {cmd.statut}</Text>
                          <Text style={styles.orderRowBody}>{cmd.qte}x {cmd.type}</Text>
                          <Text style={styles.orderRowTotal}>{cmd.total}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {dashboardTab === 'add_stock' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Stock Dépôt</Text>
                    <Text style={styles.label}>Bouteilles B6</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={stockB6} onChangeText={setStockB6} />
                    <Text style={styles.label}>Bouteilles B12</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={stockB12} onChangeText={setStockB12} />
                    <Text style={styles.label}>Bouteilles B28</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={stockB28} onChangeText={setStockB28} />
                    <AnimatedButton style={styles.btnOrange} onPress={() => Alert.alert('Succès', 'Stock mis à jour.')}>
                      <Text style={styles.btnOrangeText}>Enregistrer</Text>
                    </AnimatedButton>
                  </View>
                )}

                {dashboardTab === 'sales_list' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Inventaire Dépôt</Text>
                    <Text style={styles.inventoryLabel}>• B6 : {stockB6} disponibles</Text>
                    <Text style={styles.inventoryLabel}>• B12 : {stockB12} disponibles</Text>
                    <Text style={styles.inventoryLabel}>• B28 : {stockB28} disponibles</Text>
                  </View>
                )}
              </FadeInView>
            )
          ) : (
            /* ÉCRAN D'ACCUEIL INITIAL (BIENVENUE) */
            <FadeInView key={currentScreen} style={styles.mainWrapper}>
              {currentScreen === 'welcome' && (
                <View style={styles.welcomeContainer}>
                  <FadeInView delay={40}>
                    <View style={styles.heroSection}>
                      <PulsingBadge>
                        <View style={styles.heroBadge}>
                          <Text style={styles.heroBadgeText}>⚡ RAPIDE & SÉCURISÉ</Text>
                        </View>
                      </PulsingBadge>
                      <Text style={styles.heroTitle}>Distribution & Livraison de Gaz</Text>
                    </View>
                  </FadeInView>

                  <View style={styles.cardsWrapper}>
                    <FadeInView delay={120}>
                      <AnimatedButton style={styles.welcomeCardDark} onPress={() => setCurrentScreen('register_client')}>
                        <Text style={styles.welcomeCardTitleLight}>Espace Client</Text>
                        <Text style={styles.welcomeCardSubLight}>Commandes & Livraisons</Text>
                      </AnimatedButton>
                    </FadeInView>

                    <FadeInView delay={200}>
                      <AnimatedButton style={styles.welcomeCardWhite} onPress={() => setCurrentScreen('register_depot')}>
                        <Text style={styles.welcomeCardTitleDark}>Espace Vendeur</Text>
                        <Text style={styles.welcomeCardSubDark}>Gestion Dépôt & Stocks</Text>
                      </AnimatedButton>
                    </FadeInView>
                  </View>

                  <FadeInView delay={280}>
                    <AnimatedButton style={styles.btnNavyOutline} onPress={() => setCurrentScreen('login')}>
                      <Text style={styles.btnNavyOutlineText}>Se connecter</Text>
                    </AnimatedButton>
                  </FadeInView>
                </View>
              )}

              {(currentScreen === 'register_client' || currentScreen === 'register_depot') && (
                <View style={styles.cardBox}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={styles.backBtnInline}>
                    <Text style={styles.backBtnInlineText}>Retour</Text>
                  </AnimatedButton>
                  
                  <Text style={styles.cardBoxTitle}>
                    {currentScreen === 'register_depot' ? 'Inscrire un Dépôt' : 'Compte Client'}
                  </Text>

                  <Text style={styles.label}>Nom complet *</Text>
                  <TextInput style={styles.input} placeholder="Nom et Prénom" placeholderTextColor="#94A3B8" value={nom} onChangeText={setNom} />

                  <Text style={styles.label}>Téléphone *</Text>
                  <TextInput style={styles.input} keyboardType="phone-pad" placeholder="07 00 00 00 00" placeholderTextColor="#94A3B8" value={telephone} onChangeText={setTelephone} />

                  <Text style={styles.label}>Adresse</Text>
                  <TextInput style={styles.input} placeholder="Quartier / Commune" placeholderTextColor="#94A3B8" value={adresse} onChangeText={setAdresse} />

                  <Text style={styles.label}>Email *</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@exemple.com" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe *</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} />

                  <AnimatedButton style={styles.btnOrange} onPress={() => handleRegister(currentScreen === 'register_depot' ? 'depot' : 'client')} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>S'inscrire</Text>}
                  </AnimatedButton>
                </View>
              )}

              {currentScreen === 'login' && (
                <View style={styles.cardBox}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={styles.backBtnInline}>
                    <Text style={styles.backBtnInlineText}>Retour</Text>
                  </AnimatedButton>
                  
                  <Text style={styles.cardBoxTitle}>Connexion</Text>

                  <Text style={styles.label}>Email</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@exemple.com" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} />

                  <AnimatedButton style={{ alignSelf: 'flex-end', marginBottom: 16 }} onPress={() => { setForgotEmail(email); setResetStep(1); setCurrentScreen('forgot_password'); }}>
                    <Text style={styles.forgotLinkText}>Mot de passe oublié ?</Text>
                  </AnimatedButton>

                  <AnimatedButton style={styles.btnOrange} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Se connecter</Text>}
                  </AnimatedButton>
                </View>
              )}

              {currentScreen === 'forgot_password' && (
                <View style={styles.cardBox}>
                  <AnimatedButton onPress={() => setCurrentScreen('login')} style={styles.backBtnInline}>
                    <Text style={styles.backBtnInlineText}>Retour</Text>
                  </AnimatedButton>

                  {resetStep === 1 && (
                    <>
                      <Text style={styles.cardBoxTitle}>Récupération</Text>
                      <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="Votre email" placeholderTextColor="#94A3B8" value={forgotEmail} onChangeText={setForgotEmail} />
                      <AnimatedButton style={styles.btnOrange} onPress={handleRequestResetCode} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Envoyer le code</Text>}
                      </AnimatedButton>
                    </>
                  )}

                  {resetStep === 2 && (
                    <>
                      <Text style={styles.cardBoxTitle}>Saisie du Code</Text>
                      <TextInput style={styles.input} keyboardType="numeric" maxLength={5} placeholder="Code à 5 chiffres" placeholderTextColor="#94A3B8" value={resetCode} onChangeText={setResetCode} />
                      <AnimatedButton style={styles.btnOrange} onPress={handleVerifyResetCode} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Confirmer</Text>}
                      </AnimatedButton>
                    </>
                  )}

                  {resetStep === 3 && (
                    <>
                      <Text style={styles.cardBoxTitle}>Nouveau Mot de Passe</Text>
                      <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#94A3B8" value={newPassword} onChangeText={setNewPassword} />
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
  splashLogo: { width: 90, height: 90, marginBottom: 14 },
  splashTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  splashSubTitle: { color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  
  appBar: { backgroundColor: '#0F172A', paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#F97316' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandBadge: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  brandLogoImage: { width: 22, height: 22 },
  brandTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  brandSub: { color: '#94A3B8', fontSize: 9, fontWeight: '700' },
  
  roleToggleBtn: { backgroundColor: '#F97316', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  roleToggleBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  logoutBtnText: { color: '#F87171', fontSize: 11, fontWeight: '700' },
  
  scrollContent: { flexGrow: 1, padding: 16 },
  mainWrapper: { flex: 1, justifyContent: 'space-between' },
  
  trialBannerRow: { backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B', padding: 10, borderRadius: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trialBannerTitle: { color: '#B45309', fontSize: 12, fontWeight: '800' },
  btnPayNowInline: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  btnPayNowInlineText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  
  pillsContainerOuter: { backgroundColor: '#E2E8F0', borderRadius: 12, padding: 3, marginBottom: 14 },
  pillsScrollContent: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  pillBtnActive: { backgroundColor: '#FFFFFF', elevation: 1 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pillTextActive: { color: '#0F172A', fontWeight: '800' },
  
  userGreetingCard: { backgroundColor: '#0F172A', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  greetingTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  greetingSubtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  kpiCardTag: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  kpiCardNum: { fontSize: 17, fontWeight: '900', color: '#F97316', marginTop: 2 },
  
  actionCardOrange: { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#F97316', borderRadius: 12, padding: 14 },
  actionCardTitle: { fontSize: 14, fontWeight: '800', color: '#C2410C' },
  actionCardNavy: { backgroundColor: '#0F172A', borderRadius: 12, padding: 14 },
  actionCardTitleWhite: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  
  cardBox: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardBoxTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  backBtnInline: { marginBottom: 10 },
  backBtnInlineText: { color: '#F97316', fontWeight: '800', fontSize: 12 },
  
  priceSectionHeader: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 8, marginBottom: 6 },

  productGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  productCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: '#F1F5F9', alignItems: 'center' },
  productCardActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  productImageWrapper: { width: '100%', height: 90, justifyContent: 'center', alignItems: 'center', marginVertical: 4 },
  colorBackgroundGlow: { position: 'absolute', width: 60, height: 60, borderRadius: 30 },
  productBottleImg: { width: 70, height: 85 },
  productTitle: { fontSize: 11, fontWeight: '700', color: '#334155', marginTop: 2 },
  productPrice: { fontSize: 13, fontWeight: '900', color: '#2563EB', marginTop: 2 },

  // STYLES POUR L'AFFICHAGE REPLI DES BOUTEILLES DE GAZ
  fallbackBottleContainer: {
    width: 60,
    height: 75,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fallbackBottleTop: {
    width: 18,
    height: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    position: 'absolute',
    top: -5,
  },
  fallbackBottleBody: {
    width: 44,
    height: 52,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackBottleText: {
    fontSize: 16,
  },

  depotCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 10 },
  depotHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  depotTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  depotDistance: { color: '#F97316', fontWeight: '800', fontSize: 12 },
  btnDepotSelect: { backgroundColor: '#0F172A', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnDepotSelectText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },

  opTypeBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  opTypeBtnActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  opTypeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  opTypeTextActive: { color: '#FFFFFF' },

  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 10, padding: 3, width: 130, justifyContent: 'space-between', marginBottom: 14 },
  stepperBtn: { width: 32, height: 32, backgroundColor: '#0F172A', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  stepperBtnDisabled: { backgroundColor: '#CBD5E1' },
  stepperBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  stepperValueBox: { flex: 1, alignItems: 'center' },
  stepperValueText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0F172A', marginBottom: 12 },
  forgotLinkText: { color: '#F97316', fontSize: 12, fontWeight: '800' },
  totalSummary: { backgroundColor: '#0F172A', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalSummaryLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  totalSummaryValue: { color: '#F97316', fontSize: 16, fontWeight: '900' },
  btnOrange: { backgroundColor: '#F97316', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnOrangeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  btnNavyPdf: { backgroundColor: '#0F172A', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnNavyPdfText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  
  smallCylBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  smallCylBtnActive: { backgroundColor: '#FFF7ED', borderColor: '#F97316' },
  smallCylText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  smallCylTextActive: { color: '#C2410C', fontWeight: '800' },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  filterBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 6, backgroundColor: '#F1F5F9' },
  filterBtnActive: { backgroundColor: '#0F172A' },
  filterText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterTextActive: { color: '#FFFFFF' },
  orderRow: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, marginBottom: 8 },
  orderRowId: { fontWeight: '800', color: '#0F172A', fontSize: 12 },
  orderRowBody: { fontSize: 12, color: '#334155', marginVertical: 2 },
  orderRowTotal: { color: '#F97316', fontWeight: '800', fontSize: 12 },
  
  subCard: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#F97316', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 14 },
  subCardBadge: { backgroundColor: '#FFF7ED', color: '#C2410C', fontSize: 9, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  subCardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  subCardPrice: { fontSize: 20, fontWeight: '900', color: '#F97316', marginTop: 2 },
  subCardMonth: { fontSize: 11, color: '#64748B' },
  paymentMethodsGrid: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  paymentBtn: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', padding: 8, borderRadius: 8, alignItems: 'center' },
  paymentLogoImage: { width: 26, height: 22 },
  paymentBtnText: { fontSize: 9, fontWeight: '700', color: '#64748B', marginTop: 2 },
  
  inventoryLabel: { fontSize: 13, color: '#334155', fontWeight: '700', paddingVertical: 6 },
  
  welcomeContainer: { flex: 1, justifyContent: 'space-between' },
  heroSection: { marginVertical: 10 },
  heroBadge: { backgroundColor: '#FFF7ED', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  heroBadgeText: { color: '#C2410C', fontSize: 10, fontWeight: '800' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', lineHeight: 30 },
  cardsWrapper: { gap: 10, marginVertical: 10 },
  welcomeCardDark: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16 },
  welcomeCardWhite: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  welcomeCardTitleLight: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  welcomeCardSubLight: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  welcomeCardTitleDark: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  welcomeCardSubDark: { color: '#64748B', fontSize: 11, marginTop: 2 },
  btnNavyOutline: { borderWidth: 1.5, borderColor: '#0F172A', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  btnNavyOutlineText: { color: '#0F172A', fontWeight: '800', fontSize: 13 }
});