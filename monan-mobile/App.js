import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Animated,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ==========================================
// CONFIGURATION MONAN (ADMIN & BACKEND)
// ==========================================
const API_BASE_URL = 'https://monan-service-pro.onrender.com';
const ADMIN_WHATSAPP_NUMBER = '2250700000000'; // Remplacez par votre numéro WhatsApp Admin (format international sans +)
const ADMIN_EMAIL = 'admin@monan.ci';
const ADMIN_PASSWORD = 'admin123';

const STORAGE_KEYS = {
  users: '@monan_users_v1',
  orders: '@monan_orders_v1',
  currentUser: '@monan_current_user_v1',
  onboarding: '@monan_onboarding_v1',
};

const FREE_TRIAL_DAYS = 30; // 1 mois d'utilisation gratuite à l'inscription
const VENDOR_COMMISSION_RATE = 0.05; // 5% sur le gaz (commission par commande)
const DRIVER_COMMISSION_RATE = 0.20; // 20% sur la course (commission par commande)
const MIN_DRIVER_WALLET_BALANCE = 500; // Solde min. livreur (FCFA)
const WALLET_TOPUP_PRESETS = [1000, 2000, 5000, 10000];

const SUBSCRIPTION_PLANS = [
  { id: '1m', label: '1 Mois', days: 30, price: 2000 },
  { id: '3m', label: '3 Mois', days: 90, price: 4500, originalPrice: 6000, badge: '-25%' },
  { id: '6m', label: '6 Mois', days: 180, price: 9000, originalPrice: 12000, badge: '-25%' },
  { id: '1y', label: '1 An', days: 365, price: 18000, originalPrice: 24000, badge: '-25%' },
];

const PAYMENT_OPERATORS = [
  { id: 'wave', name: 'Wave', logo: require('./assets/wave.jpeg') },
  { id: 'orange', name: 'Orange Money', logo: require('./assets/Orange.jpeg') },
  { id: 'mtn', name: 'MTN MoMo', logo: require('./assets/MTN.jpeg') },
  { id: 'moov', name: 'Moov Money', logo: require('./assets/Moov.jpeg') },
];

const CYLINDER_TYPES = [
  { id: 'B6', name: 'Bouteille 6kg' },
  { id: 'B12', name: 'Bouteille 12kg' },
  { id: 'B28', name: 'Bouteille 28kg' },
];

const DEFAULT_PRICES = {
  B6: { recharge: 2000, achat: 15000 },
  B12: { recharge: 5200, achat: 25000 },
  B28: { recharge: 12500, achat: 45000 },
};

const MARQUES_GAZ = [
  { id: 'petro', name: 'Petro Ivoire', color: '#E11D48' },
  { id: 'total', name: 'TotalEnergies', color: '#EF4444' },
  { id: 'oryx', name: 'Oryx', color: '#F97316' },
  { id: 'shell', name: 'Vivo / Shell', color: '#EAB308' },
  { id: 'corlay', name: 'Corlay', color: '#0284C7' },
];

const VEHICLE_TYPES = ['Moto', 'Tricycle', 'Fourgonnette'];

const BILAN_PERIODS = [
  { id: 'day', label: '24h' },
  { id: 'week', label: '7j' },
  { id: 'month', label: '30j' },
  { id: 'year', label: '1 an' },
];

const ONBOARDING_SLIDES = [
  {
    id: 'slide-1',
    badge: 'COMMANDE RAPIDE',
    title: 'Votre gaz livré chez vous',
    subtitle: 'Comparez les dépôts proches de votre quartier et commandez en quelques secondes.',
    icon: require('./assets/splash-icon.png'),
  },
  {
    id: 'slide-2',
    badge: 'ESPACE DÉPÔT',
    title: 'Gérez vos ventes & tarifs',
    subtitle: 'Fixez vos prix par format, suivez vos commandes en direct et exportez vos bilans PDF.',
    icon: require('./assets/splash-icon.png'),
  },
  {
    id: 'slide-3',
    badge: 'LIVRAISON SÉCURISÉE',
    title: 'Validation par code secret',
    subtitle: 'Chaque livraison est confirmée par un code client à 4 chiffres.',
    icon: require('./assets/splash-icon.png'),
  },
];

// ==========================================
// COMPOSANTS UI RÉUTILISABLES
// ==========================================
function FadeInView({ children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [opacity]);
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
}

function AnimatedButton({ children, style, containerStyle, onPress, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };
  return (
    <Animated.View style={[{ transform: [{ scale }] }, containerStyle]}>
      <Pressable
        style={style}
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function QuantityStepper({ value, onChange }) {
  const qty = Math.max(1, Number(value) || 1);
  return (
    <View style={styles.stepperContainer}>
      <Pressable
        style={[styles.stepperBtn, qty <= 1 && styles.stepperBtnDisabled]}
        onPress={() => qty > 1 && onChange(qty - 1)}
        disabled={qty <= 1}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </Pressable>
      <View style={styles.stepperValueBox}>
        <Text style={styles.stepperValueText}>{qty}</Text>
      </View>
      <Pressable style={styles.stepperBtn} onPress={() => onChange(qty + 1)}>
        <Text style={styles.stepperBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================
const normalizeText = (str) =>
  String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const hasValidCoords = (coords) =>
  Boolean(
    coords &&
      typeof coords.latitude === 'number' &&
      typeof coords.longitude === 'number' &&
      !Number.isNaN(coords.latitude) &&
      !Number.isNaN(coords.longitude)
  );

const showFeedbackAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const getRemainingSubscriptionDays = (u) => {
  if (!u || u.role !== 'depot') return 0;
  const expiresMs = u.subscriptionExpiresAt
    ? new Date(u.subscriptionExpiresAt).getTime()
    : u.createdAt
    ? new Date(u.createdAt).getTime() + FREE_TRIAL_DAYS * 86400000
    : 0;
  if (!expiresMs || Number.isNaN(expiresMs)) return 0;
  const diffMs = expiresMs - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / 86400000) : 0;
};

const computeWalletBalance = (u) => {
  if (!u) return 0;
  if (Array.isArray(u.walletHistory) && u.walletHistory.length > 0) {
    return u.walletHistory.reduce((acc, tx) => {
      const amt = Number(tx.amount) || 0;
      return tx.type === 'credit' ? acc + amt : acc - amt;
    }, 0);
  }
  return Number(u.walletBalance) || 0;
};

const getOrderGasCommission = (order) => {
  if (typeof order.gasCommission === 'number') return order.gasCommission;
  return Math.round((Number(order.gasSubtotal) || 0) * VENDOR_COMMISSION_RATE);
};

const getOrderDeliveryCommission = (order) => {
  if (order.deliveryMode !== 'livraison') return 0;
  if (typeof order.deliveryCommission === 'number') return order.deliveryCommission;
  return Math.round((Number(order.deliveryFee) || 0) * DRIVER_COMMISSION_RATE);
};

const calculateDistanceKm = (c1, c2) => {
  const R = 6371;
  const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.latitude * Math.PI) / 180) *
      Math.cos((c2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.5, Number((R * c).toFixed(1)));
};

const getDeliveryQuote = (vendor, clientCoords) => {
  if (hasValidCoords(vendor?.coords) && hasValidCoords(clientCoords)) {
    const km = calculateDistanceKm(vendor.coords, clientCoords);
    const fee = Math.max(500, Math.round((500 + km * 200) / 100) * 100);
    return { distanceKm: km, deliveryFee: fee, isExactGps: true };
  }
  return { distanceKm: 1.5, deliveryFee: 800, isExactGps: false };
};

// ==========================================
// APPLICATION PRINCIPALE
// ==========================================
export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [user, setUser] = useState(null);
  const [activeViewRole, setActiveViewRole] = useState('client');
  const [dashboardTab, setDashboardTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('welcome');

  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [pricesSavedFeedback, setPricesSavedFeedback] = useState(false);
  const [gpsSavedFeedback, setGpsSavedFeedback] = useState(false);
  const [pdfExportFeedback, setPdfExportFeedback] = useState(false);
  const [orderSuccessBanner, setOrderSuccessBanner] = useState('');

  // Formulaires Auth
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [ville, setVille] = useState('');
  const [adresse, setAdresse] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicule, setVehicule] = useState('Moto');
  const [registerCoords, setRegisterCoords] = useState(null);

  // Abonnement Vendeur (après le mois gratuit -> WhatsApp + Admin)
  const [selectedPlan, setSelectedPlan] = useState(SUBSCRIPTION_PLANS[0]);
  const [paymentMethod, setPaymentMethod] = useState('Wave');
  const [paymentPhone, setPaymentPhone] = useState('');

  // Portefeuille prépayé
  const [topupAmount, setTopupAmount] = useState('2000');
  const [topupOperator, setTopupOperator] = useState('Wave');
  const [adminCreditInputs, setAdminCreditInputs] = useState({});

  // Commande Client
  const [searchDepot, setSearchDepot] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [operationType, setOperationType] = useState('recharge');
  const [selectedCylinder, setSelectedCylinder] = useState(CYLINDER_TYPES[0]);
  const [selectedMarque, setSelectedMarque] = useState(MARQUES_GAZ[0]);
  const [clientCoords, setClientCoords] = useState(null);
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState('livraison');

  // Espace Vendeur
  const [vendorPricesForm, setVendorPricesForm] = useState(DEFAULT_PRICES);
  const [bilanPeriod, setBilanPeriod] = useState('day');
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState({});
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('Moto');

  // Espace Livreur
  const [driverCodeInputs, setDriverCodeInputs] = useState({});

  // ==========================================
  // INITIALISATION & SYNCHRONISATION SERVEUR
  // ==========================================
  const ensureAdminAccount = (usersList) => {
    const hasAdmin = usersList.some((u) => u.role === 'admin' || normalizeText(u.email) === ADMIN_EMAIL);
    if (hasAdmin) return usersList;
    const adminObj = {
      id: 'ADMIN-001',
      role: 'admin',
      nom: 'Administrateur MONAN',
      telephone: ADMIN_WHATSAPP_NUMBER,
      ville: 'Abidjan',
      adresse: 'Siège MONAN',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      createdAt: new Date().toISOString(),
    };
    return [adminObj, ...usersList];
  };

  const syncAppState = async (overrideUsers = null, overrideOrders = null) => {
    setSyncing(true);
    try {
      let currentUsers = overrideUsers || registeredUsers;
      let currentOrders = overrideOrders || allOrders;

      if (overrideUsers || overrideOrders) {
        try {
          await fetch(`${API_BASE_URL}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: currentUsers, orders: currentOrders }),
          });
        } catch (err) {
          // Mode hors-ligne toléré : AsyncStorage conserve les données
        }
      } else {
        try {
          const res = await fetch(`${API_BASE_URL}/api/state`);
          if (res.ok) {
            const remote = await res.json();
            if (Array.isArray(remote.users) && remote.users.length > 0) {
              currentUsers = ensureAdminAccount(remote.users);
              await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(currentUsers));
            }
            if (Array.isArray(remote.orders)) {
              currentOrders = remote.orders;
              await AsyncStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(currentOrders));
            }
          }
        } catch (err) {
          const storedUsersRaw = await AsyncStorage.getItem(STORAGE_KEYS.users);
          const storedOrdersRaw = await AsyncStorage.getItem(STORAGE_KEYS.orders);
          if (storedUsersRaw) currentUsers = ensureAdminAccount(JSON.parse(storedUsersRaw));
          if (storedOrdersRaw) currentOrders = JSON.parse(storedOrdersRaw);
        }
      }

      setRegisteredUsers(currentUsers);
      setAllOrders(currentOrders);

      if (user) {
        const refreshedUser = currentUsers.find((u) => u.id === user.id);
        if (refreshedUser) {
          setUser(refreshedUser);
          await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(refreshedUser));
        }
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const bootstrapApp = async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEYS.onboarding);
        setHasSeenOnboarding(seen === 'true');

        const storedUsersRaw = await AsyncStorage.getItem(STORAGE_KEYS.users);
        const storedOrdersRaw = await AsyncStorage.getItem(STORAGE_KEYS.orders);
        const storedUserRaw = await AsyncStorage.getItem(STORAGE_KEYS.currentUser);

        const initialUsers = ensureAdminAccount(storedUsersRaw ? JSON.parse(storedUsersRaw) : []);
        const initialOrders = storedOrdersRaw ? JSON.parse(storedOrdersRaw) : [];

        setRegisteredUsers(initialUsers);
        setAllOrders(initialOrders);
        await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(initialUsers));

        if (storedUserRaw) {
          const parsedUser = JSON.parse(storedUserRaw);
          const syncedUser = initialUsers.find((u) => u.id === parsedUser.id) || parsedUser;
          setUser(syncedUser);
          setActiveViewRole(syncedUser.role);
          setClientCoords(syncedUser.coords || null);
          setAdresseLivraison(syncedUser.adresse || '');
          setPaymentPhone(syncedUser.telephone || '');
          if (syncedUser.customPrices) {
            setVendorPricesForm({
              B6: {
                recharge: String(syncedUser.customPrices.B6?.recharge ?? DEFAULT_PRICES.B6.recharge),
                achat: String(syncedUser.customPrices.B6?.achat ?? DEFAULT_PRICES.B6.achat),
              },
              B12: {
                recharge: String(syncedUser.customPrices.B12?.recharge ?? DEFAULT_PRICES.B12.recharge),
                achat: String(syncedUser.customPrices.B12?.achat ?? DEFAULT_PRICES.B12.achat),
              },
              B28: {
                recharge: String(syncedUser.customPrices.B28?.recharge ?? DEFAULT_PRICES.B28.recharge),
                achat: String(syncedUser.customPrices.B28?.achat ?? DEFAULT_PRICES.B28.achat),
              },
            });
          } else {
            setVendorPricesForm({
              B6: { recharge: String(DEFAULT_PRICES.B6.recharge), achat: String(DEFAULT_PRICES.B6.achat) },
              B12: { recharge: String(DEFAULT_PRICES.B12.recharge), achat: String(DEFAULT_PRICES.B12.achat) },
              B28: { recharge: String(DEFAULT_PRICES.B28.recharge), achat: String(DEFAULT_PRICES.B28.achat) },
            });
          }
        }
      } finally {
        setIsAppReady(true);
      }
    };
    bootstrapApp();
  }, []);

  const handleFinishOnboarding = async () => {
    setHasSeenOnboarding(true);
    await AsyncStorage.setItem(STORAGE_KEYS.onboarding, 'true');
  };

  // ==========================================
  // AUTHENTIFICATION & INSCRIPTION
  // ==========================================
  const handleRegister = async (role) => {
    if (!nom.trim() || !telephone.trim() || !ville.trim() || !adresse.trim() || !email.trim() || !password.trim()) {
      showFeedbackAlert('Champs requis', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (registeredUsers.some((u) => normalizeText(u.email) === normalizeText(cleanEmail))) {
      showFeedbackAlert('Compte existant', 'Cet email est déjà utilisé.');
      return;
    }

    setLoading(true);
    try {
      const prefix = role === 'depot' ? 'DEP' : role === 'livreur' ? 'LIV' : 'CLI';
      const freeTrialExpiresAt =
        role === 'depot'
          ? new Date(Date.now() + FREE_TRIAL_DAYS * 86400000).toISOString()
          : null;

      const newUser = {
        id: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
        role,
        nom: nom.trim(),
        telephone: telephone.trim(),
        ville: ville.trim(),
        adresse: adresse.trim(),
        email: cleanEmail,
        password: password.trim(),
        coords: registerCoords || null,
        vehicule: role === 'livreur' ? vehicule : null,
        isDriverVerified: false,
        // 1 mois (30 jours) gratuit à l'inscription : seules les commandes sont commissionnées
        subscriptionExpiresAt: freeTrialExpiresAt,
        subscriptionPlan: role === 'depot' ? '1 Mois Gratuit' : null,
        pendingSubscription: null,
        walletBalance: 0,
        walletHistory: [],
        pendingTopup: null,
        customPrices: role === 'depot' ? DEFAULT_PRICES : null,
        createdAt: new Date().toISOString(),
      };

      const nextUsers = [newUser, ...registeredUsers];
      setRegisteredUsers(nextUsers);
      setUser(newUser);
      setActiveViewRole(newUser.role);
      setDashboardTab('home');
      setPaymentPhone(newUser.telephone);
      setAdresseLivraison(newUser.adresse);
      setClientCoords(newUser.coords || null);
      if (role === 'depot') {
        setVendorPricesForm({
          B6: { recharge: String(DEFAULT_PRICES.B6.recharge), achat: String(DEFAULT_PRICES.B6.achat) },
          B12: { recharge: String(DEFAULT_PRICES.B12.recharge), achat: String(DEFAULT_PRICES.B12.achat) },
          B28: { recharge: String(DEFAULT_PRICES.B28.recharge), achat: String(DEFAULT_PRICES.B28.achat) },
        });
      }

      await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
      await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(newUser));
      await syncAppState(nextUsers, allOrders);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showFeedbackAlert('Connexion', 'Entrez votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      await syncAppState();
      const cleanEmail = email.trim().toLowerCase();
      const found = registeredUsers.find(
        (u) => normalizeText(u.email) === normalizeText(cleanEmail) && u.password === password.trim()
      );
      if (!found) {
        showFeedbackAlert('Échec de connexion', 'Email ou mot de passe incorrect.');
        return;
      }

      setUser(found);
      setActiveViewRole(found.role);
      setDashboardTab('home');
      setPaymentPhone(found.telephone || '');
      setAdresseLivraison(found.adresse || '');
      setClientCoords(found.coords || null);
      if (found.role === 'depot') {
        const p = found.customPrices || DEFAULT_PRICES;
        setVendorPricesForm({
          B6: { recharge: String(p.B6?.recharge ?? DEFAULT_PRICES.B6.recharge), achat: String(p.B6?.achat ?? DEFAULT_PRICES.B6.achat) },
          B12: { recharge: String(p.B12?.recharge ?? DEFAULT_PRICES.B12.recharge), achat: String(p.B12?.achat ?? DEFAULT_PRICES.B12.achat) },
          B28: { recharge: String(p.B28?.recharge ?? DEFAULT_PRICES.B28.recharge), achat: String(p.B28?.achat ?? DEFAULT_PRICES.B28.achat) },
        });
      }
      await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(found));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setActiveViewRole('client');
    setDashboardTab('home');
    setCurrentScreen('welcome');
    await AsyncStorage.removeItem(STORAGE_KEYS.currentUser);
  };

  const switchVendorMode = (mode) => {
    if (user?.role === 'depot' && getRemainingSubscriptionDays(user) <= 0) return;
    setActiveViewRole(mode);
    setDashboardTab('home');
  };

  // ==========================================
  // ABONNEMENT VENDEUR (APRÈS ESSAI GRATUIT -> WHATSAPP + ADMIN)
  // ==========================================
  const handleRenewSubscription = async () => {
    if (!user || user.role !== 'depot') return;
    if (!paymentPhone.trim() || paymentPhone.trim().length < 8) {
      showFeedbackAlert('Numéro requis', `Indiquez votre numéro ${paymentMethod} ayant effectué le transfert.`);
      return;
    }

    setLoading(true);
    try {
      const pendingSub = {
        planId: selectedPlan.id,
        label: selectedPlan.label,
        days: selectedPlan.days,
        price: selectedPlan.price,
        operator: paymentMethod,
        senderPhone: paymentPhone.trim(),
        requestedAt: new Date().toISOString(),
      };

      const nextUsers = registeredUsers.map((u) =>
        u.id === user.id ? { ...u, pendingSubscription: pendingSub } : u
      );
      const nextUser = { ...user, pendingSubscription: pendingSub };

      setRegisteredUsers(nextUsers);
      setUser(nextUser);
      await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
      await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));
      await syncAppState(nextUsers, allOrders);

      const message =
        `Bonjour Admin MONAN,\n` +
        `Je demande le renouvellement de mon abonnement Dépôt :\n` +
        `• Dépôt : ${user.nom} (${user.id})\n` +
        `• Ville : ${user.ville}\n` +
        `• Formule : ${selectedPlan.label} (${selectedPlan.days} jours)\n` +
        `• Montant : ${selectedPlan.price.toLocaleString('fr-FR')} FCFA\n` +
        `• Opérateur : ${paymentMethod}\n` +
        `• Numéro payeur : ${paymentPhone.trim()}\n` +
        `Voici la capture de mon paiement Mobile Money.`;

      const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        showFeedbackAlert(
          'Demande enregistrée',
          `Envoyez votre reçu de ${selectedPlan.price.toLocaleString('fr-FR')} FCFA (${paymentMethod}) sur WhatsApp au +${ADMIN_WHATSAPP_NUMBER} pour validation.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminActivateSubscription = async (depotUser, plan) => {
    if (!depotUser || !plan) return;
    const currentExpiryMs = depotUser.subscriptionExpiresAt
      ? new Date(depotUser.subscriptionExpiresAt).getTime()
      : depotUser.createdAt
      ? new Date(depotUser.createdAt).getTime() + FREE_TRIAL_DAYS * 86400000
      : 0;
    const baseMs = currentExpiryMs > Date.now() ? currentExpiryMs : Date.now();
    const newExpiryIso = new Date(baseMs + Number(plan.days) * 86400000).toISOString();

    const nextUsers = registeredUsers.map((u) =>
      u.id === depotUser.id
        ? {
            ...u,
            subscriptionExpiresAt: newExpiryIso,
            subscriptionPlan: plan.label,
            pendingSubscription: null,
          }
        : u
    );

    setRegisteredUsers(nextUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
    await syncAppState(nextUsers, allOrders);
    showFeedbackAlert(
      'Abonnement activé',
      `Forfait ${plan.label} (+${plan.days} jours) validé pour ${depotUser.nom}.`
    );
  };

  // ==========================================
  // PORTEFEUILLE PRÉPAYÉ & VALIDATION CNI
  // ==========================================
  const handleRequestWalletTopup = async () => {
    if (!user) return;
    const amt = Number(topupAmount);
    if (!amt || amt < 500) {
      showFeedbackAlert('Montant invalide', 'Entrez un montant minimum de 500 FCFA.');
      return;
    }

    const pendingTopup = {
      amount: amt,
      operator: topupOperator,
      requestedAt: new Date().toISOString(),
    };

    const nextUsers = registeredUsers.map((u) =>
      u.id === user.id ? { ...u, pendingTopup } : u
    );
    const nextUser = { ...user, pendingTopup };

    setRegisteredUsers(nextUsers);
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
    await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));
    await syncAppState(nextUsers, allOrders);

    const roleLabel = user.role === 'depot' ? 'Dépôt' : 'Livreur';
    const message =
      `Bonjour Admin MONAN,\n` +
      `Demande de recharge Portefeuille Prépayé :\n` +
      `• Profil : ${roleLabel} - ${user.nom} (${user.id})\n` +
      `• Ville : ${user.ville}\n` +
      `• Montant : ${amt.toLocaleString('fr-FR')} FCFA\n` +
      `• Opérateur : ${topupOperator}\n` +
      `Je vous envoie la preuve de transfert Mobile Money.`;

    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      showFeedbackAlert(
        'Demande enregistrée',
        `Envoyez votre preuve de transfert de ${amt.toLocaleString('fr-FR')} FCFA sur WhatsApp au +${ADMIN_WHATSAPP_NUMBER}.`
      );
    }
  };

  const handleAdminCreditWallet = async (partner, rawAmount) => {
    const amt = Number(rawAmount);
    if (!partner || !amt || amt <= 0) {
      showFeedbackAlert('Montant requis', 'Entrez un montant valide en FCFA.');
      return;
    }

    const creditTx = {
      id: `TX-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      type: 'credit',
      amount: amt,
      label: `Recharge Admin (${partner.pendingTopup?.operator || 'Mobile Money'})`,
      createdAt: new Date().toISOString(),
    };

    const nextUsers = registeredUsers.map((u) => {
      if (u.id !== partner.id) return u;
      const history = [creditTx, ...(Array.isArray(u.walletHistory) ? u.walletHistory : [])];
      const updated = { ...u, walletHistory: history, pendingTopup: null };
      updated.walletBalance = computeWalletBalance(updated);
      return updated;
    });

    setRegisteredUsers(nextUsers);
    setAdminCreditInputs((prev) => ({ ...prev, [partner.id]: '' }));
    await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
    await syncAppState(nextUsers, allOrders);
    showFeedbackAlert('Compte crédité', `+${amt.toLocaleString('fr-FR')} FCFA ajoutés à ${partner.nom}.`);
  };

  const handleSendDriverCniWhatsApp = async () => {
    if (!user) return;
    const message =
      `Bonjour Admin MONAN,\n` +
      `Je souhaite faire valider ma CNI pour activer mon compte Livreur :\n` +
      `• Nom : ${user.nom}\n` +
      `• ID : ${user.id}\n` +
      `• Téléphone : ${user.telephone}\n` +
      `• Ville : ${user.ville}\n` +
      `• Véhicule : ${user.vehicule || 'Moto'}\n` +
      `Voici la photo recto/verso de ma CNI.`;
    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      showFeedbackAlert('Validation CNI', `Envoyez votre CNI sur WhatsApp au +${ADMIN_WHATSAPP_NUMBER}.`);
    }
  };

  const handleToggleDriverVerification = async (driverId, status) => {
    const nextUsers = registeredUsers.map((u) =>
      u.id === driverId ? { ...u, isDriverVerified: status } : u
    );
    setRegisteredUsers(nextUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
    await syncAppState(nextUsers, allOrders);
  };

  const handleAddDriverFromVendor = async () => {
    if (!newDriverName.trim() || !newDriverPhone.trim()) {
      showFeedbackAlert('Champs requis', 'Entrez le nom et le téléphone du livreur.');
      return;
    }
    const newDriver = {
      id: `LIV-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'livreur',
      nom: newDriverName.trim(),
      telephone: newDriverPhone.trim(),
      ville: user.ville,
      adresse: user.adresse,
      email: `livreur.${Date.now()}@monan.ci`,
      password: '123456',
      vehicule: newDriverVehicle,
      isDriverVerified: false,
      walletBalance: 0,
      walletHistory: [],
      createdAt: new Date().toISOString(),
    };
    const nextUsers = [newDriver, ...registeredUsers];
    setRegisteredUsers(nextUsers);
    setNewDriverName('');
    setNewDriverPhone('');
    await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
    await syncAppState(nextUsers, allOrders);
    showFeedbackAlert(
      'Livreur ajouté',
      `${newDriver.nom} a été enregistré. Son compte sera actif après validation de sa CNI par l'Admin.`
    );
  };

  // ==========================================
  // GPS & TARIFS VENDEUR
  // ==========================================
  const captureDeviceGPS = async ({ silent = false, fillAddress = false, onCaptured } = {}) => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) showFeedbackAlert('Permission GPS', 'Autorisez la localisation pour calculer la distance.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        latitude: Number(loc.coords.latitude.toFixed(6)),
        longitude: Number(loc.coords.longitude.toFixed(6)),
      };
      if (onCaptured) onCaptured(coords);
      if (fillAddress && !adresseLivraison.trim()) {
        setAdresseLivraison(`GPS (${coords.latitude}, ${coords.longitude})`);
      }
    } catch (err) {
      if (!silent) showFeedbackAlert('Erreur GPS', 'Impossible de récupérer votre position actuelle.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleUpdateVendorGPS = () => {
    captureDeviceGPS({
      silent: false,
      onCaptured: async (coords) => {
        const nextUsers = registeredUsers.map((u) => (u.id === user.id ? { ...u, coords } : u));
        const nextUser = { ...user, coords };
        setRegisteredUsers(nextUsers);
        setUser(nextUser);
        await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
        await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));
        await syncAppState(nextUsers, allOrders);
        setGpsSavedFeedback(true);
        setTimeout(() => setGpsSavedFeedback(false), 3000);
      },
    });
  };

  const handleSaveVendorPrices = async () => {
    setSavingPrices(true);
    try {
      const parsedPrices = {
        B6: {
          recharge: Number(vendorPricesForm.B6?.recharge) || DEFAULT_PRICES.B6.recharge,
          achat: Number(vendorPricesForm.B6?.achat) || DEFAULT_PRICES.B6.achat,
        },
        B12: {
          recharge: Number(vendorPricesForm.B12?.recharge) || DEFAULT_PRICES.B12.recharge,
          achat: Number(vendorPricesForm.B12?.achat) || DEFAULT_PRICES.B12.achat,
        },
        B28: {
          recharge: Number(vendorPricesForm.B28?.recharge) || DEFAULT_PRICES.B28.recharge,
          achat: Number(vendorPricesForm.B28?.achat) || DEFAULT_PRICES.B28.achat,
        },
      };

      const nextUsers = registeredUsers.map((u) =>
        u.id === user.id ? { ...u, customPrices: parsedPrices } : u
      );
      const nextUser = { ...user, customPrices: parsedPrices };
      setRegisteredUsers(nextUsers);
      setUser(nextUser);
      await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
      await AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));
      await syncAppState(nextUsers, allOrders);
      setPricesSavedFeedback(true);
      setTimeout(() => setPricesSavedFeedback(false), 3000);
    } finally {
      setSavingPrices(false);
    }
  };

  // ==========================================
  // DONNÉES DÉRIVÉES & LOGIQUE MÉTIER
  // ==========================================
  const remainingSubDays = getRemainingSubscriptionDays(user);
  const isVendorSubscriptionExpired = user?.role === 'depot' && remainingSubDays <= 0;

  const currentWalletBalance = user ? computeWalletBalance(user) : 0;

  const vendorReservedCommission =
    user?.role === 'depot'
      ? allOrders
          .filter(
            (o) =>
              o.assignedVendorId === user.id &&
              (o.status === 'accepted' || o.status === 'in_delivery')
          )
          .reduce((sum, o) => sum + getOrderGasCommission(o), 0)
      : 0;
  const vendorAvailableWallet = currentWalletBalance - vendorReservedCommission;
  const isVendorWalletLow = vendorAvailableWallet < 200;

  const driverReservedCommission =
    user?.role === 'livreur'
      ? allOrders
          .filter((o) => o.assignedDriverId === user.id && o.status === 'in_delivery')
          .reduce((sum, o) => sum + getOrderDeliveryCommission(o), 0)
      : 0;
  const driverAvailableWallet = currentWalletBalance - driverReservedCommission;
  const isDriverAccountVerified = user?.isDriverVerified === true;
  const isDriverWalletBlocked = driverAvailableWallet < MIN_DRIVER_WALLET_BALANCE;

  const userCity = user?.ville || 'Abidjan';
  const normalizedUserCity = normalizeText(userCity);

  const getVendorUnitPrice = (vendor, cylId, opType) => {
    const custom = vendor?.customPrices?.[cylId]?.[opType];
    return Number(custom) > 0 ? Number(custom) : DEFAULT_PRICES[cylId][opType];
  };

  // Dépôts actifs (mois gratuit en cours ou abonnement validé) dans la ville du client
  const localCityVendors = registeredUsers
    .filter(
      (u) =>
        u.role === 'depot' &&
        u.id !== user?.id &&
        normalizeText(u.ville) === normalizedUserCity &&
        getRemainingSubscriptionDays(u) > 0
    )
    .map((vendor) => ({
      ...vendor,
      currentOfferPrice: getVendorUnitPrice(vendor, selectedCylinder.id, operationType),
      deliveryQuote: getDeliveryQuote(vendor, clientCoords),
    }));

  const activeOfferVendor =
    localCityVendors.find((v) => v.id === selectedVendorId) || localCityVendors[0] || null;
  const activeDeliveryQuote = activeOfferVendor?.deliveryQuote || {
    distanceKm: 1.5,
    deliveryFee: 800,
    isExactGps: false,
  };

  const qty = Math.max(1, Number(quantite) || 1);
  const unitPrice =
    activeOfferVendor?.currentOfferPrice || DEFAULT_PRICES[selectedCylinder.id][operationType];
  const gasSubtotal = unitPrice * qty;
  const deliveryFee = deliveryMode === 'livraison' ? activeDeliveryQuote.deliveryFee : 0;
  const totalClient = gasSubtotal + deliveryFee;
  const gasCommission = Math.round(gasSubtotal * VENDOR_COMMISSION_RATE);
  const vendorNet = gasSubtotal - gasCommission;
  const deliveryCommission =
    deliveryMode === 'livraison' ? Math.round(deliveryFee * DRIVER_COMMISSION_RATE) : 0;
  const driverNet = deliveryFee - deliveryCommission;

  const currentFinancials = {
    qty,
    unitPrice,
    gasSubtotal,
    deliveryFee,
    totalClient,
    distanceKm: activeDeliveryQuote.distanceKm,
  };

  const handleCreateOrder = async () => {
    if (!user || !activeOfferVendor) return;
    if (deliveryMode === 'livraison' && !adresseLivraison.trim()) {
      showFeedbackAlert('Adresse requise', 'Indiquez votre quartier ou point de repère.');
      return;
    }
    setLoading(true);
    try {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const newOrder = {
        id: `CMD-${Math.floor(10000 + Math.random() * 90000)}`,
        status: 'available',
        clientId: user.id,
        clientNom: user.nom,
        clientPhone: user.telephone,
        clientCoords: clientCoords || user.coords || null,
        ville: userCity,
        adresse: adresseLivraison.trim() || user.adresse || userCity,
        targetVendorId: activeOfferVendor.id,
        targetVendorNom: activeOfferVendor.nom,
        operation: operationType,
        type: `${selectedCylinder.id} ${selectedMarque.name}`,
        qte: qty,
        deliveryMode,
        distanceKm: activeDeliveryQuote.distanceKm,
        gasSubtotal,
        deliveryFee,
        gasCommission,
        vendorNet,
        deliveryCommission,
        driverNet,
        total: `${totalClient.toLocaleString('fr-FR')} FCFA`,
        deliveryCode: deliveryMode === 'livraison' ? code : null,
        createdAt: new Date().toISOString(),
        date: new Date().toLocaleDateString('fr-FR'),
      };

      const nextOrders = [newOrder, ...allOrders];
      setAllOrders(nextOrders);
      await AsyncStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
      await syncAppState(registeredUsers, nextOrders);
      setOrderSuccessBanner(`✓ Commande ${newOrder.id} envoyée à ${activeOfferVendor.nom}`);
      setDashboardTab('orders_list');
      setTimeout(() => setOrderSuccessBanner(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    const order = allOrders.find((o) => o.id === orderId);
    if (!order || !user) return;
    const needed = getOrderGasCommission(order);
    if (vendorAvailableWallet < needed) {
      showFeedbackAlert(
        'Solde prépayé insuffisant',
        `Il vous faut au moins ${needed.toLocaleString('fr-FR')} FCFA disponibles pour accepter cette commande.`
      );
      setDashboardTab('wallet');
      return;
    }
    const nextOrders = allOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: 'accepted',
            assignedVendorId: user.id,
            assignedVendorNom: user.nom,
          }
        : o
    );
    setAllOrders(nextOrders);
    await AsyncStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
    await syncAppState(registeredUsers, nextOrders);
  };

  const debitWalletTransaction = (usersList, partnerId, amount, label) => {
    if (!partnerId || amount <= 0) return usersList;
    const tx = {
      id: `TX-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      type: 'debit',
      amount,
      label,
      createdAt: new Date().toISOString(),
    };
    return usersList.map((u) => {
      if (u.id !== partnerId) return u;
      const history = [tx, ...(Array.isArray(u.walletHistory) ? u.walletHistory : [])];
      const nextObj = { ...u, walletHistory: history };
      nextObj.walletBalance = computeWalletBalance(nextObj);
      return nextObj;
    });
  };

  const handleCompletePickupOrder = async (orderId) => {
    const order = allOrders.find((o) => o.id === orderId);
    if (!order) return;
    const gasComm = getOrderGasCommission(order);
    const nextOrders = allOrders.map((o) =>
      o.id === orderId ? { ...o, status: 'delivered' } : o
    );
    const nextUsers = debitWalletTransaction(
      registeredUsers,
      order.assignedVendorId,
      gasComm,
      `Commission 5% (${order.id})`
    );
    setAllOrders(nextOrders);
    setRegisteredUsers(nextUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
    await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
    await syncAppState(nextUsers, nextOrders);
  };

  const handleAssignDriverToOrder = async (orderId) => {
    const chosenId = selectedDriverByOrder[orderId] || verifiedCityDrivers[0]?.id;
    const drv = verifiedCityDrivers.find((d) => d.id === chosenId);
    if (!drv) return;
    const nextOrders = allOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: 'in_delivery',
            assignedDriverId: drv.id,
            assignedDriverNom: drv.nom,
            assignedDriverPhone: drv.telephone,
          }
        : o
    );
    setAllOrders(nextOrders);
    await AsyncStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
    await syncAppState(registeredUsers, nextOrders);
  };

  const handleDriverClaimOrder = async (orderId) => {
    if (!user || !isDriverAccountVerified || isDriverWalletBlocked) return;
    const nextOrders = allOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: 'in_delivery',
            assignedDriverId: user.id,
            assignedDriverNom: user.nom,
            assignedDriverPhone: user.telephone,
          }
        : o
    );
    setAllOrders(nextOrders);
    await AsyncStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
    await syncAppState(registeredUsers, nextOrders);
    setDashboardTab('driver_active');
  };

  const handleDriverConfirmDelivery = async (orderId) => {
    const order = allOrders.find((o) => o.id === orderId);
    if (!order) return;
    const entered = (driverCodeInputs[orderId] || '').trim();
    if (order.deliveryCode && entered !== String(order.deliveryCode)) {
      showFeedbackAlert('Code incorrect', 'Demandez le code secret à 4 chiffres au client.');
      return;
    }
    const gasComm = getOrderGasCommission(order);
    const delComm = getOrderDeliveryCommission(order);

    let nextUsers = debitWalletTransaction(
      registeredUsers,
      order.assignedVendorId,
      gasComm,
      `Commission gaz 5% (${order.id})`
    );
    nextUsers = debitWalletTransaction(
      nextUsers,
      order.assignedDriverId,
      delComm,
      `Commission course 20% (${order.id})`
    );
    const nextOrders = allOrders.map((o) =>
      o.id === orderId ? { ...o, status: 'delivered' } : o
    );

    setRegisteredUsers(nextUsers);
    setAllOrders(nextOrders);
    await AsyncStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
    await AsyncStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
    await syncAppState(nextUsers, nextOrders);
    showFeedbackAlert('Livraison validée', `Course ${order.id} terminée avec succès.`);
  };

  // Bilan vendeur
  const bilanOrders =
    activeViewRole === 'depot'
      ? allOrders.filter((o) => {
          if (o.assignedVendorId !== user?.id) return false;
          const created = new Date(o.createdAt || Date.now()).getTime();
          const now = Date.now();
          const maxAge =
            bilanPeriod === 'day'
              ? 86400000
              : bilanPeriod === 'week'
              ? 7 * 86400000
              : bilanPeriod === 'month'
              ? 30 * 86400000
              : 365 * 86400000;
          return now - created <= maxAge;
        })
      : [];

  const bilanDeliveredCount = bilanOrders.filter((o) => o.status === 'delivered').length;
  const bilanTotalCylinders = bilanOrders.reduce((s, o) => s + (Number(o.qte) || 0), 0);
  const bilanGasGross = bilanOrders.reduce((s, o) => s + (Number(o.gasSubtotal) || 0), 0);
  const bilanCommission = bilanOrders.reduce((s, o) => s + getOrderGasCommission(o), 0);
  const bilanVendorNet = bilanGasGross - bilanCommission;

  const getBilanPeriodSummaryLabel = () => {
    if (bilanPeriod === 'day') return "Aujourd'hui (24h)";
    if (bilanPeriod === 'week') return '7 derniers jours';
    if (bilanPeriod === 'month') return '30 derniers jours';
    return '12 derniers mois';
  };

  const handleExportBilanPDF = async () => {
    setExportingPdf(true);
    try {
      const rowsHtml = bilanOrders
        .map(
          (o) =>
            `<tr><td>${o.id}</td><td>${o.date}</td><td>${o.qte}x ${o.type}</td><td>${(
              o.vendorNet || 0
            ).toLocaleString('fr-FR')} F</td></tr>`
        )
        .join('');
      const html = `
        <html><body style="font-family:sans-serif;padding:24px;">
          <h2>Bilan Vendeur MONAN — ${user?.nom || ''}</h2>
          <p>Période : ${getBilanPeriodSummaryLabel()} • Ville : ${userCity}</p>
          <p><strong>Ventes brutes :</strong> ${bilanGasGross.toLocaleString('fr-FR')} FCFA</p>
          <p><strong>Commission 5% :</strong> -${bilanCommission.toLocaleString('fr-FR')} FCFA</p>
          <p><strong>Revenu net :</strong> ${bilanVendorNet.toLocaleString('fr-FR')} FCFA</p>
          <table border="1" cellpadding="6" cellspacing="0" width="100%">
            <tr><th>ID</th><th>Date</th><th>Détail</th><th>Net</th></tr>
            ${rowsHtml}
          </table>
        </body></html>
      `;
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Bilan MONAN - ${user?.nom || ''}`,
            UTI: 'com.adobe.pdf',
          });
        } else {
          await Print.printAsync({ html });
        }
      }
      setPdfExportFeedback(true);
      setTimeout(() => setPdfExportFeedback(false), 3500);
    } catch (err) {
      showFeedbackAlert('Erreur PDF', 'Impossible de générer le bilan PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const filteredDepotsList = localCityVendors.filter(
    (d) =>
      d.nom.toLowerCase().includes(searchDepot.toLowerCase()) ||
      (d.adresse || '').toLowerCase().includes(searchDepot.toLowerCase())
  );

  const cityDrivers = registeredUsers.filter(
    (u) => u.role === 'livreur' && normalizeText(u.ville) === normalizedUserCity
  );
  const verifiedCityDrivers = cityDrivers.filter((u) => u.isDriverVerified === true);

  const allDriversSortedForAdmin = registeredUsers
    .filter((u) => u.role === 'livreur')
    .sort((a, b) => (a.isDriverVerified === true ? 1 : 0) - (b.isDriverVerified === true ? 1 : 0));

  const pendingDriversForAdmin = allDriversSortedForAdmin.filter((u) => u.isDriverVerified !== true);
  const allDepotsForAdmin = registeredUsers.filter((u) => u.role === 'depot');

  const allWalletPartnersForAdmin = registeredUsers
    .filter((u) => u.role === 'depot' || u.role === 'livreur')
    .map((u) => ({
      ...u,
      computedBalance: computeWalletBalance(u),
    }))
    .sort((a, b) => {
      const aReq = a.pendingTopup ? 1 : 0;
      const bReq = b.pendingTopup ? 1 : 0;
      if (aReq !== bReq) return bReq - aReq;
      return a.computedBalance - b.computedBalance;
    });

  const pendingTopupsCountForAdmin = allWalletPartnersForAdmin.filter((u) =>
    Boolean(u.pendingTopup)
  ).length;
  const pendingSubscriptionsCountForAdmin = allDepotsForAdmin.filter((u) =>
    Boolean(u.pendingSubscription)
  ).length;

  const deliveredOrdersAll = allOrders.filter((o) => o.status === 'delivered');
  const totalCollectedGasCommissions = deliveredOrdersAll.reduce(
    (sum, o) => sum + getOrderGasCommission(o),
    0
  );
  const totalCollectedDeliveryCommissions = deliveredOrdersAll.reduce(
    (sum, o) => sum + getOrderDeliveryCommission(o),
    0
  );
  const totalPlatformCommissions =
    totalCollectedGasCommissions + totalCollectedDeliveryCommissions;

  const depotCommissionsSummary = allDepotsForAdmin
    .map((dep) => {
      const depOrders = allOrders.filter((o) => o.assignedVendorId === dep.id);
      const depDeliveredOrders = depOrders.filter((o) => o.status === 'delivered');
      const totalSalesGross = depDeliveredOrders.reduce(
        (sum, o) => sum + (Number(o.gasSubtotal) || 0),
        0
      );
      const totalGasCommissionCollected = depDeliveredOrders.reduce(
        (sum, o) => sum + getOrderGasCommission(o),
        0
      );
      return {
        ...dep,
        walletBalance: computeWalletBalance(dep),
        ordersCount: depOrders.length,
        deliveredOrdersCount: depDeliveredOrders.length,
        totalSalesGross,
        totalGasCommissionCollected,
        remainingDays: getRemainingSubscriptionDays(dep),
      };
    })
    .sort((a, b) => {
      const aSubReq = a.pendingSubscription ? 1 : 0;
      const bSubReq = b.pendingSubscription ? 1 : 0;
      if (aSubReq !== bSubReq) return bSubReq - aSubReq;
      return a.remainingDays - b.remainingDays;
    });

  const availableOrdersForVendors =
    activeViewRole === 'depot'
      ? allOrders.filter(
          (c) =>
            c.status === 'available' &&
            normalizeText(c.ville) === normalizedUserCity &&
            (!c.targetVendorId || c.targetVendorId === user?.id)
        )
      : [];

  const myVendorDeliveries =
    activeViewRole === 'depot'
      ? allOrders.filter(
          (c) =>
            c.assignedVendorId === user?.id &&
            (c.status === 'accepted' || c.status === 'in_delivery')
        )
      : [];

  const availableOrdersForDrivers =
    activeViewRole === 'livreur' && isDriverAccountVerified && !isDriverWalletBlocked
      ? allOrders.filter(
          (c) =>
            c.status === 'accepted' &&
            c.deliveryMode === 'livraison' &&
            !c.assignedDriverId &&
            normalizeText(c.ville) === normalizedUserCity
        )
      : [];

  const myDriverActiveOrders =
    activeViewRole === 'livreur'
      ? allOrders.filter((c) => c.assignedDriverId === user?.id && c.status === 'in_delivery')
      : [];

  const myDriverDeliveredOrders =
    activeViewRole === 'livreur'
      ? allOrders.filter((c) => c.assignedDriverId === user?.id && c.status === 'delivered')
      : [];

  const myClientOrders =
    activeViewRole === 'client' ? allOrders.filter((c) => c.clientId === user?.id) : [];

  const getRoleSubtitle = () => {
    if (!user) return 'Distribution de gaz';
    if (user.role === 'admin') return 'Administration MONAN';
    if (user.role === 'depot')
      return activeViewRole === 'depot' ? `Vendeur • ${userCity}` : `Client • ${userCity}`;
    if (user.role === 'livreur') return `Livreur • ${userCity}`;
    return `Client • ${userCity}`;
  };

  const getStatusMeta = (cmd) => {
    if (cmd.status === 'delivered') {
      return {
        label: cmd.deliveryMode === 'retrait' ? 'Retirée' : 'Livrée',
        color: '#4ADE80',
        bg: 'rgba(74, 222, 128, 0.14)',
      };
    }
    if (cmd.status === 'in_delivery') {
      return {
        label: `En route • ${cmd.assignedDriverNom}`,
        color: '#38BDF8',
        bg: 'rgba(56, 189, 248, 0.14)',
      };
    }
    if (cmd.status === 'accepted') {
      return {
        label:
          cmd.deliveryMode === 'retrait'
            ? `Prête • ${cmd.assignedVendorNom}`
            : `Validée • ${cmd.assignedVendorNom}`,
        color: '#FBBF24',
        bg: 'rgba(251, 191, 36, 0.14)',
      };
    }
    return { label: 'En attente', color: '#F97316', bg: 'rgba(249, 115, 22, 0.14)' };
  };

  const getBottomNavItems = () => {
    if (activeViewRole === 'admin') {
      return [
        { id: 'home', label: 'Accueil', badge: 0 },
        { id: 'admin_drivers', label: 'CNI', badge: pendingDriversForAdmin.length },
        { id: 'admin_wallets', label: 'Soldes', badge: pendingTopupsCountForAdmin },
        { id: 'admin_commissions', label: 'Dépôts', badge: pendingSubscriptionsCountForAdmin },
      ];
    }
    if (activeViewRole === 'depot') {
      return [
        { id: 'home', label: 'Accueil', badge: 0 },
        { id: 'vendor_live_orders', label: 'Commandes', badge: availableOrdersForVendors.length },
        { id: 'my_deliveries', label: 'En cours', badge: myVendorDeliveries.length },
        { id: 'wallet', label: 'Solde', badge: isVendorWalletLow ? 1 : 0 },
        { id: 'pricing', label: 'Tarifs', badge: 0 },
      ];
    }
    if (activeViewRole === 'livreur') {
      return [
        { id: 'home', label: 'Accueil', badge: 0 },
        { id: 'driver_available', label: 'Courses', badge: availableOrdersForDrivers.length },
        { id: 'driver_active', label: 'En cours', badge: myDriverActiveOrders.length },
        { id: 'wallet', label: 'Solde', badge: isDriverWalletBlocked ? 1 : 0 },
        { id: 'driver_history', label: 'Livrées', badge: 0 },
      ];
    }
    return [
      { id: 'home', label: 'Accueil', badge: 0 },
      { id: 'depots', label: 'Vendeurs', badge: localCityVendors.length },
      { id: 'order', label: 'Commander', badge: 0 },
      {
        id: 'orders_list',
        label: 'Suivi',
        badge: myClientOrders.filter((o) => o.status !== 'delivered').length,
      },
    ];
  };

  if (!isAppReady || hasSeenOnboarding === null) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
        <Image source={require('./assets/splash-icon.png')} style={styles.splashLogo} resizeMode="contain" />
        <Text style={styles.splashTitle}>MONAN</Text>
        <ActivityIndicator size="small" color="#F97316" style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    const currentSlide = ONBOARDING_SLIDES[onboardingStep];
    const isLastSlide = onboardingStep === ONBOARDING_SLIDES.length - 1;

    return (
      <SafeAreaView style={styles.onboardingContainer}>
        <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
        <View style={styles.onboardingHeader}>
          <Pressable onPress={handleFinishOnboarding} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Passer</Text>
          </Pressable>
        </View>

        <FadeInView key={currentSlide.id} style={styles.onboardingSlideWrapper}>
          <View style={styles.onboardingBadgeBox}>
            <Image source={currentSlide.icon} style={styles.onboardingLogo} resizeMode="contain" />
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{currentSlide.badge}</Text>
          </View>
          <Text style={styles.onboardingTitle}>{currentSlide.title}</Text>
          <Text style={styles.onboardingSub}>{currentSlide.subtitle}</Text>
        </FadeInView>

        <View style={styles.onboardingFooter}>
          <View style={styles.paginationDotsRow}>
            {ONBOARDING_SLIDES.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, onboardingStep === index ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>

          <View style={styles.onboardingBtnRow}>
            {onboardingStep > 0 && (
              <AnimatedButton style={styles.btnSecondary} onPress={() => setOnboardingStep((prev) => prev - 1)}>
                <Text style={styles.btnSecondaryText}>Retour</Text>
              </AnimatedButton>
            )}
            <AnimatedButton
              containerStyle={{ flex: 1 }}
              style={styles.btnPrimary}
              onPress={() => (isLastSlide ? handleFinishOnboarding() : setOnboardingStep((prev) => prev + 1))}
            >
              <Text style={styles.btnPrimaryText}>{isLastSlide ? 'Démarrer' : 'Suivant'}</Text>
            </AnimatedButton>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* EN-TÊTE */}
      <View style={styles.appBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Image source={require('./assets/splash-icon.png')} style={styles.brandLogoImage} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.brandTitle}>MONAN</Text>
            <Text style={styles.brandSub}>{getRoleSubtitle()}</Text>
          </View>
        </View>

        {user && (
          <View style={styles.headerActions}>
            <AnimatedButton style={styles.syncBtn} onPress={() => syncAppState()} disabled={syncing}>
              <Text style={styles.syncBtnText}>{syncing ? '...' : '↻'}</Text>
            </AnimatedButton>

            {user.role === 'depot' && !isVendorSubscriptionExpired && (
              <View style={styles.segmentedSwitch}>
                <Pressable
                  style={[styles.segmentItem, activeViewRole === 'depot' && styles.segmentItemActive]}
                  onPress={() => switchVendorMode('depot')}
                >
                  <Text style={[styles.segmentText, activeViewRole === 'depot' && styles.segmentTextActive]}>
                    Dépôt
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentItem, activeViewRole === 'client' && styles.segmentItemActive]}
                  onPress={() => switchVendorMode('client')}
                >
                  <Text style={[styles.segmentText, activeViewRole === 'client' && styles.segmentTextActive]}>
                    Client
                  </Text>
                </Pressable>
              </View>
            )}

            <AnimatedButton style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Sortir</Text>
            </AnimatedButton>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            user && !isVendorSubscriptionExpired && { paddingBottom: 88 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {user ? (
            isVendorSubscriptionExpired ? (
              /* BLOCAGE ABONNEMENT EXPIRÉ (APRÈS LES 30 JOURS GRATUITS) */
              <FadeInView key="subscription-lock" style={styles.mainWrapper}>
                <View style={styles.cardBox}>
                  <View style={styles.statusPillDanger}>
                    <Text style={styles.statusPillDangerText}>PÉRIODE GRATUITE / ABONNEMENT EXPIRÉ</Text>
                  </View>
                  <Text style={styles.cardBoxTitle}>Renouveler ({user.nom})</Text>
                  <Text style={styles.mutedText}>
                    Votre mois d’utilisation gratuite est terminé. Choisissez une formule, transférez via Mobile Money puis envoyez le reçu sur WhatsApp pour réactiver votre espace.
                  </Text>

                  {user.pendingSubscription && (
                    <View style={[styles.toastWarning, { marginTop: 12 }]}>
                      <Text style={styles.toastWarningText}>
                        Demande en attente : Forfait {user.pendingSubscription.label} (
                        {Number(user.pendingSubscription.price).toLocaleString('fr-FR')} F) via{' '}
                        {user.pendingSubscription.operator}. Appuyez sur ↻ après validation par l’Admin.
                      </Text>
                    </View>
                  )}

                  <View style={{ gap: 8, marginTop: 14, marginBottom: 16 }}>
                    {SUBSCRIPTION_PLANS.map((plan) => {
                      const isSelected = selectedPlan.id === plan.id;
                      return (
                        <AnimatedButton
                          key={plan.id}
                          style={[styles.selectRowCard, isSelected && styles.selectRowCardActive]}
                          onPress={() => setSelectedPlan(plan)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.selectRowTitle, isSelected && { color: '#F97316' }]}>
                              {plan.label}
                            </Text>
                            {plan.originalPrice && (
                              <View style={styles.discountBadge}>
                                <Text style={styles.discountBadgeText}>{plan.badge}</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            {plan.originalPrice && (
                              <Text style={styles.strikePrice}>
                                {plan.originalPrice.toLocaleString('fr-FR')} F
                              </Text>
                            )}
                            <Text style={styles.selectRowPrice}>{plan.price.toLocaleString('fr-FR')} F</Text>
                          </View>
                        </AnimatedButton>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Opérateur Mobile Money</Text>
                  <View style={styles.operatorRow}>
                    {PAYMENT_OPERATORS.map((op) => {
                      const isSelected = paymentMethod === op.name;
                      return (
                        <AnimatedButton
                          key={op.id}
                          containerStyle={{ flex: 1 }}
                          style={[styles.operatorTile, isSelected && styles.operatorTileActive]}
                          onPress={() => setPaymentMethod(op.name)}
                        >
                          {isSelected && (
                            <View style={styles.operatorCheckBadge}>
                              <Text style={styles.operatorCheckText}>✓</Text>
                            </View>
                          )}
                          <Image source={op.logo} style={styles.operatorTileLogo} resizeMode="contain" />
                        </AnimatedButton>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Numéro {paymentMethod} utilisé</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    placeholder="0707070707"
                    placeholderTextColor="#64748B"
                    value={paymentPhone}
                    onChangeText={setPaymentPhone}
                  />

                  <AnimatedButton style={styles.btnWhatsapp} onPress={handleRenewSubscription} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.btnWhatsappText}>
                        Envoyer demande {selectedPlan.price.toLocaleString('fr-FR')} F (WhatsApp)
                      </Text>
                    )}
                  </AnimatedButton>
                </View>
              </FadeInView>
            ) : (
              <FadeInView key={`${dashboardTab}-${activeViewRole}`} style={styles.mainWrapper}>
                {/* ACCUEIL */}
                {dashboardTab === 'home' && (
                  <View style={{ gap: 12 }}>
                    <View style={styles.profileCard}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{(user.nom || 'U').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.greetingTitle}>{user.nom}</Text>
                        <Text style={styles.mutedText}>
                          {user.role === 'admin'
                            ? 'Espace Administrateur • MONAN'
                            : `${userCity} • ${user.adresse}`}
                        </Text>
                        {hasValidCoords(user.coords) && (
                          <Text style={styles.gpsBadgeText}>
                            GPS : {user.coords.latitude}, {user.coords.longitude}
                          </Text>
                        )}
                      </View>
                    </View>

                    {activeViewRole === 'livreur' && !isDriverAccountVerified && (
                      <View style={styles.driverBlockedCard}>
                        <View style={styles.statusPillDanger}>
                          <Text style={styles.statusPillDangerText}>COMPTE BLOQUÉ • EN ATTENTE CNI</Text>
                        </View>
                        <Text style={styles.driverBlockedTitle}>Validation d'identité requise</Text>
                        <Text style={styles.driverBlockedText}>
                          Votre compte ({user.id}) est en attente de vérification. Envoyez la photo de votre CNI à l'administrateur sur WhatsApp, puis appuyez sur ↻ une fois validé.
                        </Text>
                        <AnimatedButton style={styles.btnWhatsapp} onPress={handleSendDriverCniWhatsApp}>
                          <Text style={styles.btnWhatsappText}>Envoyer ma CNI (WhatsApp)</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {(activeViewRole === 'depot' || activeViewRole === 'livreur') && (
                      <View
                        style={[
                          styles.walletStrip,
                          ((activeViewRole === 'depot' && isVendorWalletLow) ||
                            (activeViewRole === 'livreur' && isDriverWalletBlocked)) &&
                            styles.walletStripDanger,
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.microLabel}>PORTEFEUILLE PRÉPAYÉ MONAN</Text>
                          <Text
                            style={[
                              styles.walletStripValue,
                              ((activeViewRole === 'depot' && isVendorWalletLow) ||
                                (activeViewRole === 'livreur' && isDriverWalletBlocked)) && {
                                color: '#F87171',
                              },
                            ]}
                          >
                            {currentWalletBalance.toLocaleString('fr-FR')} FCFA
                          </Text>
                          <Text style={styles.mutedText}>
                            {activeViewRole === 'depot'
                              ? isVendorWalletLow
                                ? 'Solde insuffisant • Rechargez pour accepter des commandes'
                                : `Disponible : ${Math.max(0, vendorAvailableWallet).toLocaleString(
                                    'fr-FR'
                                  )} F (Commission 5 %)`
                              : isDriverWalletBlocked
                              ? `Solde min. ${MIN_DRIVER_WALLET_BALANCE} F requis pour prendre des courses`
                              : `Disponible : ${Math.max(0, driverAvailableWallet).toLocaleString(
                                  'fr-FR'
                                )} F (Commission 20 %)`}
                          </Text>
                        </View>
                        <AnimatedButton
                          style={styles.compactPrimaryBtn}
                          onPress={() => setDashboardTab('wallet')}
                        >
                          <Text style={styles.compactPrimaryBtnText}>Recharger</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {user.role === 'depot' && activeViewRole === 'depot' && (
                      <View style={styles.subStrip}>
                        <View>
                          <Text style={styles.microLabel}>
                            {!user.subscriptionPlan || user.subscriptionPlan === '1 Mois Gratuit'
                              ? 'ESSAI GRATUIT (1 MOIS)'
                              : 'ABONNEMENT'}
                          </Text>
                          <Text style={styles.subStripValue}>{remainingSubDays} j restants</Text>
                        </View>
                        <AnimatedButton style={styles.compactPrimaryBtn} onPress={() => setDashboardTab('bilan')}>
                          <Text style={styles.compactPrimaryBtnText}>Bilan PDF</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {/* INDICATEURS CLÉS */}
                    <View style={styles.kpiGrid}>
                      {activeViewRole === 'admin' && (
                        <>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('admin_drivers')}>
                            <Text style={[styles.kpiNum, pendingDriversForAdmin.length > 0 && { color: '#F87171' }]}>
                              {pendingDriversForAdmin.length}
                            </Text>
                            <Text style={styles.kpiLabel}>CNI attente</Text>
                          </Pressable>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('admin_wallets')}>
                            <Text style={[styles.kpiNum, pendingTopupsCountForAdmin > 0 && { color: '#38BDF8' }]}>
                              {pendingTopupsCountForAdmin}
                            </Text>
                            <Text style={styles.kpiLabel}>Recharges</Text>
                          </Pressable>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('admin_commissions')}>
                            <Text
                              style={[styles.kpiNum, pendingSubscriptionsCountForAdmin > 0 && { color: '#FBBF24' }]}
                            >
                              {pendingSubscriptionsCountForAdmin}
                            </Text>
                            <Text style={styles.kpiLabel}>Abonnements</Text>
                          </Pressable>
                        </>
                      )}

                      {activeViewRole === 'depot' && (
                        <>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('vendor_live_orders')}>
                            <Text style={styles.kpiNum}>{availableOrdersForVendors.length}</Text>
                            <Text style={styles.kpiLabel}>En attente</Text>
                          </Pressable>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('my_deliveries')}>
                            <Text style={styles.kpiNum}>{myVendorDeliveries.length}</Text>
                            <Text style={styles.kpiLabel}>En cours</Text>
                          </Pressable>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('vendor_drivers')}>
                            <Text style={styles.kpiNum}>{verifiedCityDrivers.length}</Text>
                            <Text style={styles.kpiLabel}>Livreurs</Text>
                          </Pressable>
                        </>
                      )}

                      {activeViewRole === 'livreur' && (
                        <>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('driver_available')}>
                            <Text style={styles.kpiNum}>{availableOrdersForDrivers.length}</Text>
                            <Text style={styles.kpiLabel}>Disponibles</Text>
                          </Pressable>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('driver_active')}>
                            <Text style={styles.kpiNum}>{myDriverActiveOrders.length}</Text>
                            <Text style={styles.kpiLabel}>En cours</Text>
                          </Pressable>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('driver_history')}>
                            <Text style={styles.kpiNum}>{myDriverDeliveredOrders.length}</Text>
                            <Text style={styles.kpiLabel}>Livrées</Text>
                          </Pressable>
                        </>
                      )}

                      {activeViewRole === 'client' && (
                        <>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('depots')}>
                            <Text style={styles.kpiNum}>{localCityVendors.length}</Text>
                            <Text style={styles.kpiLabel}>Vendeurs</Text>
                          </Pressable>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('orders_list')}>
                            <Text style={styles.kpiNum}>{myClientOrders.length}</Text>
                            <Text style={styles.kpiLabel}>Commandes</Text>
                          </Pressable>
                        </>
                      )}
                    </View>

                    {activeViewRole === 'client' && (
                      <View style={styles.cardBox}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.cardBoxTitle}>Offres à {userCity}</Text>
                          <View style={styles.cityPill}>
                            <Text style={styles.cityPillText}>{localCityVendors.length} dépôt(s)</Text>
                          </View>
                        </View>

                        {localCityVendors.length === 0 ? (
                          <View style={styles.emptyStateBox}>
                            <Text style={styles.emptyStateText}>Aucun vendeur actif à {userCity}</Text>
                          </View>
                        ) : (
                          localCityVendors.map((vendor) => (
                            <View key={vendor.id} style={styles.orderCard}>
                              <View style={styles.rowBetween}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.listRowTitle}>{vendor.nom}</Text>
                                  <Text style={styles.mutedText}>
                                    {vendor.adresse} • {vendor.deliveryQuote.distanceKm} km (
                                    {vendor.deliveryQuote.isExactGps ? 'GPS' : 'Est.'}) • Livraison :{' '}
                                    {vendor.deliveryQuote.deliveryFee.toLocaleString('fr-FR')} F
                                  </Text>
                                </View>
                                <AnimatedButton
                                  style={styles.compactPrimaryBtn}
                                  onPress={() => {
                                    setSelectedVendorId(vendor.id);
                                    setDashboardTab('order');
                                  }}
                                >
                                  <Text style={styles.compactPrimaryBtnText}>Choisir</Text>
                                </AnimatedButton>
                              </View>

                              <View style={styles.vendorPriceBadgesRow}>
                                <View style={styles.miniPriceTag}>
                                  <Text style={styles.miniPriceTagText}>
                                    B6 Rech : {getVendorUnitPrice(vendor, 'B6', 'recharge').toLocaleString('fr-FR')} F
                                  </Text>
                                </View>
                                <View style={styles.miniPriceTag}>
                                  <Text style={styles.miniPriceTagText}>
                                    B12 Rech : {getVendorUnitPrice(vendor, 'B12', 'recharge').toLocaleString('fr-FR')} F
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {activeViewRole === 'admin' && (
                      <View style={{ gap: 10 }}>
                        <View style={styles.subStrip}>
                          <View>
                            <Text style={styles.microLabel}>COMMISSIONS PRÉLEVÉES (LIVRÉES)</Text>
                            <Text style={styles.subStripValue}>
                              {totalPlatformCommissions.toLocaleString('fr-FR')} FCFA
                            </Text>
                          </View>
                          <AnimatedButton
                            style={styles.compactPrimaryBtn}
                            onPress={() => setDashboardTab('admin_commissions')}
                          >
                            <Text style={styles.compactPrimaryBtnText}>Dépôts</Text>
                          </AnimatedButton>
                        </View>

                        <AnimatedButton style={styles.btnPrimary} onPress={() => setDashboardTab('admin_wallets')}>
                          <Text style={styles.btnPrimaryText}>
                            Gérer les portefeuilles prépayés ({pendingTopupsCountForAdmin} demande)
                          </Text>
                        </AnimatedButton>

                        <AnimatedButton
                          style={styles.btnSecondary}
                          onPress={() => setDashboardTab('admin_commissions')}
                        >
                          <Text style={styles.btnSecondaryText}>
                            Abonnements & Commissions dépôts ({pendingSubscriptionsCountForAdmin})
                          </Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {activeViewRole === 'depot' && (
                      <View style={{ gap: 10 }}>
                        <AnimatedButton style={styles.btnPrimary} onPress={() => setDashboardTab('vendor_live_orders')}>
                          <Text style={styles.btnPrimaryText}>Commandes ({availableOrdersForVendors.length})</Text>
                        </AnimatedButton>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <AnimatedButton
                            containerStyle={{ flex: 1 }}
                            style={styles.btnSecondary}
                            onPress={() => setDashboardTab('vendor_drivers')}
                          >
                            <Text style={styles.btnSecondaryText}>Livreurs</Text>
                          </AnimatedButton>
                          <AnimatedButton
                            containerStyle={{ flex: 1 }}
                            style={styles.btnSecondary}
                            onPress={() => setDashboardTab('pricing')}
                          >
                            <Text style={styles.btnSecondaryText}>Tarifs & GPS</Text>
                          </AnimatedButton>
                        </View>
                      </View>
                    )}

                    {activeViewRole === 'livreur' && (
                      <View style={{ gap: 10 }}>
                        <AnimatedButton
                          style={[
                            styles.btnPrimary,
                            (!isDriverAccountVerified || isDriverWalletBlocked) && { opacity: 0.45 },
                          ]}
                          onPress={() => setDashboardTab('driver_available')}
                        >
                          <Text style={styles.btnPrimaryText}>Courses ({availableOrdersForDrivers.length})</Text>
                        </AnimatedButton>
                        <AnimatedButton style={styles.btnSecondary} onPress={() => setDashboardTab('driver_active')}>
                          <Text style={styles.btnSecondaryText}>En cours</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {activeViewRole === 'client' && (
                      <AnimatedButton style={styles.btnPrimary} onPress={() => setDashboardTab('order')}>
                        <Text style={styles.btnPrimaryText}>Commander</Text>
                      </AnimatedButton>
                    )}
                  </View>
                )}

                {/* PORTEFEUILLE PRÉPAYÉ (VENDEUR & LIVREUR) */}
                {(activeViewRole === 'depot' || activeViewRole === 'livreur') && dashboardTab === 'wallet' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Portefeuille Prépayé</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>
                          {activeViewRole === 'depot' ? 'Commission 5 %' : 'Commission 20 %'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.financeSplitBox}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>Solde prépayé total</Text>
                        <Text
                          style={[
                            styles.priceHighlight,
                            { fontSize: 18, color: currentWalletBalance > 0 ? '#4ADE80' : '#F87171' },
                          ]}
                        >
                          {currentWalletBalance.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>Réservé (commandes en cours)</Text>
                        <Text style={styles.financeValue}>
                          {(activeViewRole === 'depot'
                            ? vendorReservedCommission
                            : driverReservedCommission
                          ).toLocaleString('fr-FR')}{' '}
                          FCFA
                        </Text>
                      </View>
                      <View style={[styles.rowBetween, styles.financeTotalRow]}>
                        <Text style={styles.financeTotalLabel}>Solde disponible</Text>
                        <Text style={styles.financeValue}>
                          {Math.max(
                            0,
                            activeViewRole === 'depot' ? vendorAvailableWallet : driverAvailableWallet
                          ).toLocaleString('fr-FR')}{' '}
                          FCFA
                        </Text>
                      </View>
                    </View>

                    {user.pendingTopup && (
                      <View style={styles.toastWarning}>
                        <Text style={styles.toastWarningText}>
                          Demande en attente : +{Number(user.pendingTopup.amount).toLocaleString('fr-FR')} F via{' '}
                          {user.pendingTopup.operator} (validation Admin en cours)
                        </Text>
                      </View>
                    )}

                    <Text style={styles.label}>1. Montant à recharger (FCFA)</Text>
                    <View style={styles.periodRow}>
                      {WALLET_TOPUP_PRESETS.map((amt) => {
                        const isSelected = Number(topupAmount) === amt;
                        return (
                          <AnimatedButton
                            key={amt}
                            containerStyle={{ flex: 1 }}
                            style={[styles.periodBtn, isSelected && styles.segBtnActive]}
                            onPress={() => setTopupAmount(String(amt))}
                          >
                            <Text style={[styles.periodBtnText, isSelected && styles.segBtnTextActive]}>
                              {amt.toLocaleString('fr-FR')} F
                            </Text>
                          </AnimatedButton>
                        );
                      })}
                    </View>

                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="Montant personnalisé (ex: 3000)"
                      placeholderTextColor="#64748B"
                      value={topupAmount}
                      onChangeText={(val) => setTopupAmount(val.replace(/[^0-9]/g, ''))}
                    />

                    <Text style={styles.label}>2. Opérateur Mobile Money</Text>
                    <View style={styles.operatorRow}>
                      {PAYMENT_OPERATORS.map((op) => {
                        const isSelected = topupOperator === op.name;
                        return (
                          <AnimatedButton
                            key={op.id}
                            containerStyle={{ flex: 1 }}
                            style={[styles.operatorTile, isSelected && styles.operatorTileActive]}
                            onPress={() => setTopupOperator(op.name)}
                          >
                            {isSelected && (
                              <View style={styles.operatorCheckBadge}>
                                <Text style={styles.operatorCheckText}>✓</Text>
                              </View>
                            )}
                            <Image source={op.logo} style={styles.operatorTileLogo} resizeMode="contain" />
                          </AnimatedButton>
                        );
                      })}
                    </View>

                    <AnimatedButton style={styles.btnWhatsapp} onPress={handleRequestWalletTopup}>
                      <Text style={styles.btnWhatsappText}>
                        Recharger {Number(topupAmount || 0).toLocaleString('fr-FR')} F (WhatsApp)
                      </Text>
                    </AnimatedButton>

                    <View style={styles.dividerSection}>
                      <Text style={[styles.label, { marginBottom: 8 }]}>
                        Historique des mouvements ({(user.walletHistory || []).length})
                      </Text>

                      {!user.walletHistory || user.walletHistory.length === 0 ? (
                        <View style={styles.emptyStateBox}>
                          <Text style={styles.emptyStateText}>Aucun mouvement enregistré</Text>
                        </View>
                      ) : (
                        user.walletHistory.map((tx) => {
                          const isCredit = tx.type === 'credit';
                          return (
                            <View key={tx.id} style={styles.listRowCard}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.listRowTitle}>{tx.label}</Text>
                                <Text style={styles.mutedText}>
                                  {tx.createdAt ? new Date(tx.createdAt).toLocaleString('fr-FR') : '-'}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.priceHighlight,
                                  { color: isCredit ? '#4ADE80' : '#F87171' },
                                ]}
                              >
                                {isCredit ? '+' : '-'}
                                {Number(tx.amount || 0).toLocaleString('fr-FR')} F
                              </Text>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                )}

                {/* ADMIN : GESTION & CRÉDIT DES PORTEFEUILLES PRÉPAYÉS */}
                {activeViewRole === 'admin' && dashboardTab === 'admin_wallets' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Portefeuilles ({allWalletPartnersForAdmin.length})</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>{pendingTopupsCountForAdmin} demande(s)</Text>
                      </View>
                    </View>

                    {allWalletPartnersForAdmin.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucun dépôt ou livreur enregistré</Text>
                      </View>
                    ) : (
                      allWalletPartnersForAdmin.map((partner) => {
                        const bal = partner.computedBalance;
                        const hasRequest = Boolean(partner.pendingTopup);
                        return (
                          <View
                            key={partner.id}
                            style={[
                              styles.orderCard,
                              hasRequest && { borderColor: '#38BDF8', backgroundColor: '#17253B' },
                            ]}
                          >
                            <View style={styles.rowBetween}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.orderId}>{partner.nom}</Text>
                                <Text style={styles.mutedText}>
                                  {partner.role === 'depot' ? 'Vendeur' : 'Livreur'} • {partner.ville} •{' '}
                                  {partner.telephone}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.badgePill,
                                  {
                                    backgroundColor:
                                      bal > 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.18)',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.badgePillText,
                                    { color: bal > 0 ? '#4ADE80' : '#F87171' },
                                  ]}
                                >
                                  Solde : {bal.toLocaleString('fr-FR')} F
                                </Text>
                              </View>
                            </View>

                            {hasRequest && (
                              <View style={styles.toastWarning}>
                                <Text style={styles.toastWarningText}>
                                  Demande : +{Number(partner.pendingTopup.amount).toLocaleString('fr-FR')} FCFA via{' '}
                                  {partner.pendingTopup.operator}
                                </Text>
                              </View>
                            )}

                            <View style={styles.dividerSection}>
                              <Text style={styles.microLabel}>CRÉDITER LE COMPTE (FCFA)</Text>
                              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: 8 }}>
                                {[1000, 2000, 5000, 10000].map((quickAmt) => (
                                  <AnimatedButton
                                    key={quickAmt}
                                    containerStyle={{ flex: 1 }}
                                    style={styles.chip}
                                    onPress={() =>
                                      setAdminCreditInputs((prev) => ({
                                        ...prev,
                                        [partner.id]: String(quickAmt),
                                      }))
                                    }
                                  >
                                    <Text style={[styles.chipText, { textAlign: 'center', fontSize: 11 }]}>
                                      +{quickAmt / 1000}k
                                    </Text>
                                  </AnimatedButton>
                                ))}
                              </View>

                              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <TextInput
                                  style={[styles.input, { flex: 1, marginBottom: 0, height: 42 }]}
                                  keyboardType="numeric"
                                  placeholder={
                                    hasRequest ? String(partner.pendingTopup.amount) : 'Montant (ex: 5000)'
                                  }
                                  placeholderTextColor="#64748B"
                                  value={adminCreditInputs[partner.id] || ''}
                                  onChangeText={(val) =>
                                    setAdminCreditInputs((prev) => ({
                                      ...prev,
                                      [partner.id]: val.replace(/[^0-9]/g, ''),
                                    }))
                                  }
                                />
                                <AnimatedButton
                                  style={styles.compactSuccessBtn}
                                  onPress={() =>
                                    handleAdminCreditWallet(
                                      partner,
                                      adminCreditInputs[partner.id] ||
                                        (hasRequest ? partner.pendingTopup.amount : '')
                                    )
                                  }
                                >
                                  <Text style={styles.compactPrimaryBtnText}>Créditer ✓</Text>
                                </AnimatedButton>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* ADMIN : VALIDATION IDENTITÉ CNI DES LIVREURS */}
                {activeViewRole === 'admin' && dashboardTab === 'admin_drivers' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Livreurs CNI ({allDriversSortedForAdmin.length})</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>{pendingDriversForAdmin.length} en attente</Text>
                      </View>
                    </View>

                    {allDriversSortedForAdmin.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucun livreur enregistré</Text>
                      </View>
                    ) : (
                      allDriversSortedForAdmin.map((drv) => {
                        const isVerified = drv.isDriverVerified === true;
                        return (
                          <View
                            key={drv.id}
                            style={[
                              styles.orderCard,
                              !isVerified && { borderColor: '#EF4444', backgroundColor: '#231720' },
                            ]}
                          >
                            <View style={styles.rowBetween}>
                              <Text style={styles.orderId}>{drv.nom}</Text>
                              <View
                                style={[
                                  styles.badgePill,
                                  {
                                    backgroundColor: isVerified
                                      ? 'rgba(74, 222, 128, 0.15)'
                                      : 'rgba(239, 68, 68, 0.2)',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.badgePillText,
                                    { color: isVerified ? '#4ADE80' : '#F87171' },
                                  ]}
                                >
                                  {isVerified ? 'Identité validée ✓' : 'En attente CNI'}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.mutedText}>
                              ID : {drv.id} • Tél : {drv.telephone}
                            </Text>
                            <Text style={styles.mutedText}>
                              Ville : {drv.ville} ({drv.adresse}) • {drv.vehicule || 'Moto'}
                            </Text>

                            {!isVerified ? (
                              <AnimatedButton
                                style={styles.btnSuccess}
                                onPress={() => handleToggleDriverVerification(drv.id, true)}
                              >
                                <Text style={styles.btnSuccessText}>Valider identité ✓</Text>
                              </AnimatedButton>
                            ) : (
                              <AnimatedButton
                                style={styles.btnDangerOutline}
                                onPress={() => handleToggleDriverVerification(drv.id, false)}
                              >
                                <Text style={styles.btnDangerOutlineText}>Suspendre / Bloquer</Text>
                              </AnimatedButton>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* ADMIN : ABONNEMENTS & COMMISSIONS PRÉLEVÉES PAR DÉPÔT */}
                {activeViewRole === 'admin' && dashboardTab === 'admin_commissions' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Dépôts & Abonnements</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>{deliveredOrdersAll.length} livrées</Text>
                      </View>
                    </View>

                    <View style={styles.financeSplitBox}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>Commissions Gaz (5 % Dépôts)</Text>
                        <Text style={styles.financeValue}>
                          {totalCollectedGasCommissions.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>Commissions Course (20 % Livreurs)</Text>
                        <Text style={styles.financeValue}>
                          {totalCollectedDeliveryCommissions.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                      <View style={[styles.rowBetween, styles.financeTotalRow]}>
                        <Text style={styles.financeTotalLabel}>Total prélevé (portefeuilles)</Text>
                        <Text style={[styles.priceHighlight, { color: '#4ADE80' }]}>
                          {totalPlatformCommissions.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                    </View>

                    {depotCommissionsSummary.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucun dépôt enregistré</Text>
                      </View>
                    ) : (
                      depotCommissionsSummary.map((dep) => {
                        const hasSubReq = Boolean(dep.pendingSubscription);
                        const matchedReqPlan = hasSubReq
                          ? SUBSCRIPTION_PLANS.find((p) => p.id === dep.pendingSubscription.planId) || {
                              id: dep.pendingSubscription.planId || '1m',
                              label: dep.pendingSubscription.label || '1 Mois',
                              days: Number(dep.pendingSubscription.days) || 30,
                              price: Number(dep.pendingSubscription.price) || 2000,
                            }
                          : null;

                        return (
                          <View
                            key={dep.id}
                            style={[
                              styles.orderCard,
                              hasSubReq && { borderColor: '#38BDF8', backgroundColor: '#17253B' },
                            ]}
                          >
                            <View style={styles.rowBetween}>
                              <Text style={styles.listRowTitle}>{dep.nom}</Text>
                              <View
                                style={[
                                  styles.badgePill,
                                  {
                                    backgroundColor:
                                      dep.remainingDays > 0
                                        ? 'rgba(74, 222, 128, 0.15)'
                                        : 'rgba(239, 68, 68, 0.15)',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.badgePillText,
                                    { color: dep.remainingDays > 0 ? '#4ADE80' : '#F87171' },
                                  ]}
                                >
                                  {dep.remainingDays > 0 ? `Actif (${dep.remainingDays}j)` : 'Expiré'}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.mutedText}>
                              {dep.ville} • Tél : {dep.telephone} • Solde :{' '}
                              {dep.walletBalance.toLocaleString('fr-FR')} F
                            </Text>

                            {hasSubReq && matchedReqPlan && (
                              <View style={{ marginTop: 6 }}>
                                <View style={styles.toastWarning}>
                                  <Text style={styles.toastWarningText}>
                                    Demande abonnement : {matchedReqPlan.label} (
                                    {matchedReqPlan.price.toLocaleString('fr-FR')} FCFA) via{' '}
                                    {dep.pendingSubscription.operator} ({dep.pendingSubscription.senderPhone || '-'})
                                  </Text>
                                </View>
                                <AnimatedButton
                                  style={styles.btnSuccess}
                                  onPress={() => handleAdminActivateSubscription(dep, matchedReqPlan)}
                                >
                                  <Text style={styles.btnSuccessText}>
                                    Valider forfait {matchedReqPlan.label} (+{matchedReqPlan.days}j) ✓
                                  </Text>
                                </AnimatedButton>
                              </View>
                            )}

                            <View style={styles.financeSplitBox}>
                              <View style={styles.rowBetween}>
                                <Text style={styles.financeLabel}>Commandes livrées</Text>
                                <Text style={styles.financeValue}>
                                  {dep.deliveredOrdersCount} / {dep.ordersCount}
                                </Text>
                              </View>
                              <View style={styles.rowBetween}>
                                <Text style={styles.financeLabel}>Volume gaz brut livré</Text>
                                <Text style={styles.financeValue}>
                                  {dep.totalSalesGross.toLocaleString('fr-FR')} FCFA
                                </Text>
                              </View>
                              <View style={[styles.rowBetween, styles.financeTotalRow]}>
                                <Text style={styles.financeTotalLabel}>Commission gaz 5 % prélevée</Text>
                                <Text style={styles.priceHighlight}>
                                  {dep.totalGasCommissionCollected.toLocaleString('fr-FR')} FCFA
                                </Text>
                              </View>
                            </View>

                            <View style={styles.dividerSection}>
                              <Text style={styles.microLabel}>PROLONGER / ACTIVER ABONNEMENT</Text>
                              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                                {SUBSCRIPTION_PLANS.map((plan) => (
                                  <AnimatedButton
                                    key={plan.id}
                                    containerStyle={{ flex: 1 }}
                                    style={styles.chip}
                                    onPress={() => handleAdminActivateSubscription(dep, plan)}
                                  >
                                    <Text style={[styles.chipText, { textAlign: 'center', fontSize: 11 }]}>
                                      +{plan.label}
                                    </Text>
                                  </AnimatedButton>
                                ))}
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* BILAN & EXPORT PDF (UNIQUEMENT CHEZ LE VENDEUR) */}
                {activeViewRole === 'depot' && dashboardTab === 'bilan' && (
                  <View style={styles.cardBox}>
                    <Pressable onPress={() => setDashboardTab('home')} style={styles.backRow}>
                      <Text style={styles.backText}>‹ Accueil</Text>
                    </Pressable>

                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Bilan Vendeur PDF</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>{bilanOrders.length} cmd</Text>
                      </View>
                    </View>

                    <View style={styles.periodRow}>
                      {BILAN_PERIODS.map((p) => (
                        <AnimatedButton
                          key={p.id}
                          containerStyle={{ flex: 1 }}
                          style={[styles.periodBtn, bilanPeriod === p.id && styles.segBtnActive]}
                          onPress={() => setBilanPeriod(p.id)}
                        >
                          <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            style={[styles.periodBtnText, bilanPeriod === p.id && styles.segBtnTextActive]}
                          >
                            {p.label}
                          </Text>
                        </AnimatedButton>
                      ))}
                    </View>

                    <Text style={[styles.mutedText, { marginBottom: 10 }]}>
                      Période : {getBilanPeriodSummaryLabel()}
                    </Text>

                    <View style={styles.financeSplitBox}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>Commandes (Livrées)</Text>
                        <Text style={styles.financeValue}>
                          {bilanOrders.length} ({bilanDeliveredCount})
                        </Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>Bouteilles vendues</Text>
                        <Text style={styles.financeValue}>{bilanTotalCylinders}</Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>Ventes gaz brut</Text>
                        <Text style={styles.financeValue}>
                          {bilanGasGross.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>Commission prépayée (5%)</Text>
                        <Text style={styles.financeMuted}>
                          -{bilanCommission.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                      <View style={[styles.rowBetween, styles.financeTotalRow]}>
                        <Text style={styles.financeTotalLabel}>Revenu net vendeur</Text>
                        <Text style={[styles.priceHighlight, { color: '#4ADE80' }]}>
                          {bilanVendorNet.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                    </View>

                    {pdfExportFeedback && (
                      <View style={styles.toastSuccess}>
                        <Text style={styles.toastSuccessText}>✓ Bilan PDF généré</Text>
                      </View>
                    )}

                    <AnimatedButton
                      style={[styles.btnPrimary, pdfExportFeedback && { backgroundColor: '#16A34A' }]}
                      onPress={handleExportBilanPDF}
                      disabled={exportingPdf}
                    >
                      {exportingPdf ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>
                          {pdfExportFeedback ? 'PDF généré ✓' : 'Exporter PDF'}
                        </Text>
                      )}
                    </AnimatedButton>

                    <View style={{ marginTop: 14 }}>
                      {bilanOrders.length === 0 ? (
                        <View style={styles.emptyStateBox}>
                          <Text style={styles.emptyStateText}>Aucune opération sur cette période</Text>
                        </View>
                      ) : (
                        bilanOrders.map((cmd) => (
                          <View key={cmd.id} style={styles.listRowCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.listRowTitle}>
                                {cmd.id} • {cmd.qte}× {cmd.type}
                              </Text>
                              <Text style={styles.mutedText}>
                                {cmd.date} • {cmd.clientNom}
                              </Text>
                            </View>
                            <Text style={[styles.priceHighlight, { color: '#4ADE80' }]}>
                              +{(cmd.vendorNet || 0).toLocaleString('fr-FR')} F
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                )}

                {/* VENDEUR : COMMANDES DISPONIBLES */}
                {activeViewRole === 'depot' && dashboardTab === 'vendor_live_orders' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Commandes ({userCity})</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>
                          Solde : {Math.max(0, vendorAvailableWallet).toLocaleString('fr-FR')} F
                        </Text>
                      </View>
                    </View>

                    {availableOrdersForVendors.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune commande en attente</Text>
                      </View>
                    ) : (
                      availableOrdersForVendors.map((order) => {
                        const gasComm = getOrderGasCommission(order);
                        return (
                          <View key={order.id} style={styles.orderCard}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.orderId}>{order.id}</Text>
                              <View
                                style={[
                                  styles.badgePill,
                                  {
                                    backgroundColor:
                                      order.deliveryMode === 'livraison'
                                        ? 'rgba(56, 189, 248, 0.15)'
                                        : 'rgba(251, 191, 36, 0.15)',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.badgePillText,
                                    { color: order.deliveryMode === 'livraison' ? '#38BDF8' : '#FBBF24' },
                                  ]}
                                >
                                  {order.deliveryMode === 'livraison'
                                    ? `Livraison (${order.distanceKm || 1.5} km)`
                                    : 'Retrait'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.orderMainText}>
                              {order.qte}× {order.type} • {order.operation}
                            </Text>
                            <Text style={styles.mutedText}>
                              {order.clientNom} ({order.clientPhone})
                            </Text>
                            <Text style={styles.mutedText}>{order.adresse}</Text>
                            {hasValidCoords(order.clientCoords) && (
                              <Text style={styles.gpsBadgeText}>
                                GPS Client : {order.clientCoords.latitude}, {order.clientCoords.longitude}
                              </Text>
                            )}

                            <View style={styles.financeSplitBox}>
                              <View style={styles.rowBetween}>
                                <Text style={styles.financeLabel}>Total client</Text>
                                <Text style={styles.financeValue}>{order.total}</Text>
                              </View>
                              <View style={styles.rowBetween}>
                                <Text style={styles.financeLabel}>Votre part nette (95 %)</Text>
                                <Text style={[styles.financeValue, { color: '#4ADE80' }]}>
                                  {(order.vendorNet || 0).toLocaleString('fr-FR')} FCFA
                                </Text>
                              </View>
                              <View style={styles.rowBetween}>
                                <Text style={styles.financeLabel}>Prélèvement portefeuille (5 %)</Text>
                                <Text style={[styles.financeValue, { color: '#F97316' }]}>
                                  -{gasComm.toLocaleString('fr-FR')} FCFA
                                </Text>
                              </View>
                            </View>

                            <AnimatedButton style={styles.btnSuccess} onPress={() => handleAcceptOrder(order.id)}>
                              <Text style={styles.btnSuccessText}>Accepter</Text>
                            </AnimatedButton>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* VENDEUR : LIVRAISONS & RETRAITS */}
                {activeViewRole === 'depot' && dashboardTab === 'my_deliveries' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>En cours</Text>
                    {myVendorDeliveries.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune commande active</Text>
                      </View>
                    ) : (
                      myVendorDeliveries.map((order) => {
                        const activeSelectedDriverId =
                          selectedDriverByOrder[order.id] || verifiedCityDrivers[0]?.id;
                        const isAssigned = order.status === 'in_delivery';
                        const isPickup = order.deliveryMode === 'retrait';

                        return (
                          <View key={order.id} style={styles.orderCard}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.orderId}>{order.id}</Text>
                              <View
                                style={[
                                  styles.badgePill,
                                  {
                                    backgroundColor: isPickup
                                      ? 'rgba(74, 222, 128, 0.15)'
                                      : isAssigned
                                      ? 'rgba(56, 189, 248, 0.15)'
                                      : 'rgba(251, 191, 36, 0.15)',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.badgePillText,
                                    { color: isPickup ? '#4ADE80' : isAssigned ? '#38BDF8' : '#FBBF24' },
                                  ]}
                                >
                                  {isPickup ? 'Retrait' : isAssigned ? 'En route' : 'À assigner'}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.orderMainText}>
                              {order.qte}× {order.type}
                            </Text>
                            <Text style={styles.mutedText}>
                              {order.clientNom} • {order.adresse}
                            </Text>
                            <Text style={styles.priceHighlight}>
                              Votre part : {(order.vendorNet || 0).toLocaleString('fr-FR')} FCFA
                            </Text>

                            {isPickup ? (
                              <AnimatedButton
                                style={styles.btnSuccess}
                                onPress={() => handleCompletePickupOrder(order.id)}
                              >
                                <Text style={styles.btnSuccessText}>Confirmer retrait</Text>
                              </AnimatedButton>
                            ) : !isAssigned ? (
                              <View style={styles.dividerSection}>
                                <Text style={styles.microLabel}>
                                  LIVREURS VALIDÉS • GAIN ({order.distanceKm || 1.5} KM) :{' '}
                                  {(order.driverNet || 0).toLocaleString('fr-FR')} F
                                </Text>
                                {verifiedCityDrivers.length === 0 ? (
                                  <Text style={[styles.mutedText, { marginTop: 6, marginBottom: 8 }]}>
                                    Aucun livreur validé disponible à {userCity}.
                                  </Text>
                                ) : (
                                  <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ marginTop: 6, marginBottom: 10 }}
                                  >
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                      {verifiedCityDrivers.map((drv) => {
                                        const isChosen = activeSelectedDriverId === drv.id;
                                        return (
                                          <AnimatedButton
                                            key={drv.id}
                                            style={[styles.chip, isChosen && styles.chipActive]}
                                            onPress={() =>
                                              setSelectedDriverByOrder((prev) => ({
                                                ...prev,
                                                [order.id]: drv.id,
                                              }))
                                            }
                                          >
                                            <Text style={[styles.chipText, isChosen && styles.chipTextActive]}>
                                              {drv.nom} ({drv.vehicule || 'Moto'})
                                            </Text>
                                          </AnimatedButton>
                                        );
                                      })}
                                    </View>
                                  </ScrollView>
                                )}

                                <AnimatedButton
                                  style={[styles.btnPrimary, verifiedCityDrivers.length === 0 && { opacity: 0.5 }]}
                                  onPress={() => handleAssignDriverToOrder(order.id)}
                                  disabled={verifiedCityDrivers.length === 0}
                                >
                                  <Text style={styles.btnPrimaryText}>Assigner</Text>
                                </AnimatedButton>
                              </View>
                            ) : (
                              <View style={styles.driverAssignedStrip}>
                                <Text style={styles.driverAssignedText}>
                                  Livreur : {order.assignedDriverNom} ({order.assignedDriverPhone}) •{' '}
                                  {(order.driverNet || 0).toLocaleString('fr-FR')} F
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* VENDEUR : LIVREURS DE LA VILLE */}
                {activeViewRole === 'depot' && dashboardTab === 'vendor_drivers' && (
                  <View style={styles.cardBox}>
                    <Pressable onPress={() => setDashboardTab('home')} style={styles.backRow}>
                      <Text style={styles.backText}>‹ Accueil</Text>
                    </Pressable>

                    <Text style={styles.cardBoxTitle}>
                      Livreurs validés ({verifiedCityDrivers.length}/{cityDrivers.length})
                    </Text>

                    <View style={styles.subCard}>
                      <TextInput
                        style={styles.input}
                        placeholder="Nom du livreur"
                        placeholderTextColor="#64748B"
                        value={newDriverName}
                        onChangeText={setNewDriverName}
                      />
                      <TextInput
                        style={styles.input}
                        keyboardType="phone-pad"
                        placeholder="Téléphone"
                        placeholderTextColor="#64748B"
                        value={newDriverPhone}
                        onChangeText={setNewDriverPhone}
                      />
                      <View style={styles.segmentedRow}>
                        {VEHICLE_TYPES.map((v) => (
                          <AnimatedButton
                            key={v}
                            containerStyle={{ flex: 1 }}
                            style={[styles.segBtn, newDriverVehicle === v && styles.segBtnActive]}
                            onPress={() => setNewDriverVehicle(v)}
                          >
                            <Text style={[styles.segBtnText, newDriverVehicle === v && styles.segBtnTextActive]}>
                              {v}
                            </Text>
                          </AnimatedButton>
                        ))}
                      </View>
                      <AnimatedButton style={styles.btnPrimary} onPress={handleAddDriverFromVendor}>
                        <Text style={styles.btnPrimaryText}>Ajouter</Text>
                      </AnimatedButton>
                    </View>

                    {cityDrivers.map((drv) => {
                      const isVerified = drv.isDriverVerified === true;
                      const drvBal = computeWalletBalance(drv);
                      const activeCount = allOrders.filter(
                        (o) => o.assignedDriverId === drv.id && o.status === 'in_delivery'
                      ).length;

                      return (
                        <View key={drv.id} style={styles.listRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>{drv.nom}</Text>
                            <Text style={styles.mutedText}>
                              {drv.telephone} • {drv.vehicule || 'Moto'} • Solde :{' '}
                              {drvBal.toLocaleString('fr-FR')} F
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.badgePill,
                              {
                                backgroundColor: !isVerified
                                  ? 'rgba(239, 68, 68, 0.16)'
                                  : activeCount > 0
                                  ? 'rgba(249, 115, 22, 0.15)'
                                  : 'rgba(74, 222, 128, 0.15)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgePillText,
                                {
                                  color: !isVerified
                                    ? '#F87171'
                                    : activeCount > 0
                                    ? '#F97316'
                                    : '#4ADE80',
                                },
                              ]}
                            >
                              {!isVerified ? 'En attente CNI' : activeCount > 0 ? 'En course' : 'Libre'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* VENDEUR : TARIFS & POSITION GPS */}
                {activeViewRole === 'depot' && dashboardTab === 'pricing' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Tarifs & GPS</Text>

                    <View style={styles.gpsBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.microLabel}>POSITION GPS</Text>
                        <Text style={styles.gpsCoordValue}>
                          {hasValidCoords(user.coords)
                            ? `${user.coords.latitude}, ${user.coords.longitude}`
                            : 'Non enregistrée'}
                        </Text>
                      </View>
                      <AnimatedButton
                        style={[styles.gpsActionBtn, gpsSavedFeedback && { backgroundColor: '#16A34A' }]}
                        onPress={handleUpdateVendorGPS}
                        disabled={gpsLoading}
                      >
                        <Text style={styles.gpsActionBtnText}>
                          {gpsLoading ? 'GPS...' : gpsSavedFeedback ? 'Enregistré ✓' : 'Ma position'}
                        </Text>
                      </AnimatedButton>
                    </View>

                    {gpsSavedFeedback && (
                      <View style={[styles.toastSuccess, { marginTop: 10, marginBottom: 0 }]}>
                        <Text style={styles.toastSuccessText}>✓ Position GPS enregistrée</Text>
                      </View>
                    )}

                    <View style={{ marginTop: 14 }}>
                      {['B6', 'B12', 'B28'].map((fmt) => (
                        <View key={fmt} style={{ marginBottom: 12 }}>
                          <Text style={styles.microLabel}>FORMAT {fmt}</Text>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.label}>Recharge (FCFA)</Text>
                              <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={vendorPricesForm[fmt]?.recharge || ''}
                                onChangeText={(val) =>
                                  setVendorPricesForm({
                                    ...vendorPricesForm,
                                    [fmt]: { ...vendorPricesForm[fmt], recharge: val },
                                  })
                                }
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.label}>Bouteille neuve (FCFA)</Text>
                              <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={vendorPricesForm[fmt]?.achat || ''}
                                onChangeText={(val) =>
                                  setVendorPricesForm({
                                    ...vendorPricesForm,
                                    [fmt]: { ...vendorPricesForm[fmt], achat: val },
                                  })
                                }
                              />
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>

                    {pricesSavedFeedback && (
                      <View style={styles.toastSuccess}>
                        <Text style={styles.toastSuccessText}>✓ Tarifs enregistrés</Text>
                      </View>
                    )}

                    <AnimatedButton
                      style={[styles.btnPrimary, pricesSavedFeedback && { backgroundColor: '#16A34A' }]}
                      onPress={handleSaveVendorPrices}
                      disabled={savingPrices}
                    >
                      <Text style={styles.btnPrimaryText}>
                        {savingPrices
                          ? 'Enregistrement...'
                          : pricesSavedFeedback
                          ? 'Enregistré ✓'
                          : 'Enregistrer'}
                      </Text>
                    </AnimatedButton>
                  </View>
                )}

                {/* LIVREUR : COURSES DISPONIBLES DANS SA VILLE */}
                {activeViewRole === 'livreur' && dashboardTab === 'driver_available' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Courses ({userCity})</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>
                          Solde : {Math.max(0, driverAvailableWallet).toLocaleString('fr-FR')} F
                        </Text>
                      </View>
                    </View>

                    {!isDriverAccountVerified ? (
                      <View style={styles.driverBlockedCard}>
                        <View style={styles.statusPillDanger}>
                          <Text style={styles.statusPillDangerText}>COMPTE BLOQUÉ • EN ATTENTE CNI</Text>
                        </View>
                        <Text style={styles.driverBlockedTitle}>Accès aux courses verrouillé</Text>
                        <Text style={styles.driverBlockedText}>
                          Envoyez votre CNI via WhatsApp à l'administrateur ({user.id}), puis appuyez sur ↻ en haut dès qu'elle est validée.
                        </Text>
                        <AnimatedButton style={styles.btnWhatsapp} onPress={handleSendDriverCniWhatsApp}>
                          <Text style={styles.btnWhatsappText}>Envoyer ma CNI (WhatsApp)</Text>
                        </AnimatedButton>
                      </View>
                    ) : isDriverWalletBlocked ? (
                      <View style={styles.driverBlockedCard}>
                        <View style={styles.statusPillDanger}>
                          <Text style={styles.statusPillDangerText}>PORTEFEUILLE PRÉPAYÉ INSUFFISANT</Text>
                        </View>
                        <Text style={styles.driverBlockedTitle}>Rechargement requis pour rouler</Text>
                        <Text style={styles.driverBlockedText}>
                          Votre solde disponible est de{' '}
                          {Math.max(0, driverAvailableWallet).toLocaleString('fr-FR')} FCFA (minimum requis :{' '}
                          {MIN_DRIVER_WALLET_BALANCE} FCFA). Rechargez votre compte pour recevoir les courses.
                        </Text>
                        <AnimatedButton style={styles.btnPrimary} onPress={() => setDashboardTab('wallet')}>
                          <Text style={styles.btnPrimaryText}>Recharger mon portefeuille</Text>
                        </AnimatedButton>
                      </View>
                    ) : availableOrdersForDrivers.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune course disponible</Text>
                      </View>
                    ) : (
                      availableOrdersForDrivers.map((order) => {
                        const delComm = getOrderDeliveryCommission(order);
                        return (
                          <View key={order.id} style={styles.orderCard}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.orderId}>
                                {order.id} • {order.distanceKm || 1.5} km
                              </Text>
                              <View style={[styles.badgePill, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
                                <Text style={[styles.badgePillText, { color: '#4ADE80' }]}>
                                  Gain net : {(order.driverNet || 0).toLocaleString('fr-FR')} F
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.orderMainText}>
                              {order.qte}× {order.type}
                            </Text>
                            <Text style={styles.mutedText}>Dépôt : {order.assignedVendorNom}</Text>
                            <Text style={styles.mutedText}>Destination : {order.adresse}</Text>
                            {hasValidCoords(order.clientCoords) && (
                              <Text style={styles.gpsBadgeText}>
                                GPS Client : {order.clientCoords.latitude}, {order.clientCoords.longitude}
                              </Text>
                            )}
                            <Text style={styles.mutedText}>
                              Encaissement client : {order.total} • Commission portefeuille : -
                              {delComm.toLocaleString('fr-FR')} F
                            </Text>

                            <AnimatedButton style={styles.btnSuccess} onPress={() => handleDriverClaimOrder(order.id)}>
                              <Text style={styles.btnSuccessText}>Accepter</Text>
                            </AnimatedButton>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* LIVREUR : EN COURS */}
                {activeViewRole === 'livreur' && dashboardTab === 'driver_active' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>En cours</Text>
                    {myDriverActiveOrders.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune course en cours</Text>
                      </View>
                    ) : (
                      myDriverActiveOrders.map((order) => (
                        <View key={order.id} style={styles.orderCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.orderId}>
                              {order.id} • {order.distanceKm || 1.5} km
                            </Text>
                            <Text style={[styles.priceHighlight, { color: '#4ADE80' }]}>
                              Gain : {(order.driverNet || 0).toLocaleString('fr-FR')} F
                            </Text>
                          </View>
                          <Text style={styles.orderMainText}>
                            {order.qte}× {order.type} ({order.operation})
                          </Text>
                          <Text style={styles.mutedText}>
                            {order.clientNom} • {order.clientPhone}
                          </Text>
                          <Text style={styles.mutedText}>{order.adresse}</Text>
                          {hasValidCoords(order.clientCoords) && (
                            <Text style={styles.gpsBadgeText}>
                              GPS : {order.clientCoords.latitude}, {order.clientCoords.longitude}
                            </Text>
                          )}
                          <Text style={styles.mutedText}>
                            Total à encaisser : {order.total} • Commission MONAN : -
                            {getOrderDeliveryCommission(order).toLocaleString('fr-FR')} F
                          </Text>

                          <View style={styles.dividerSection}>
                            <Text style={styles.microLabel}>CODE SECRET CLIENT (4 CHIFFRES)</Text>
                            <TextInput
                              style={[styles.input, styles.secretCodeInput]}
                              keyboardType="number-pad"
                              maxLength={4}
                              placeholder="Ex: 4829"
                              placeholderTextColor="#64748B"
                              value={driverCodeInputs[order.id] || ''}
                              onChangeText={(val) =>
                                setDriverCodeInputs((prev) => ({
                                  ...prev,
                                  [order.id]: val.replace(/[^0-9]/g, ''),
                                }))
                              }
                            />
                            <AnimatedButton
                              style={styles.btnSuccess}
                              onPress={() => handleDriverConfirmDelivery(order.id)}
                            >
                              <Text style={styles.btnSuccessText}>Valider la livraison</Text>
                            </AnimatedButton>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* LIVREUR : HISTORIQUE */}
                {activeViewRole === 'livreur' && dashboardTab === 'driver_history' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Livrées</Text>
                    {myDriverDeliveredOrders.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune livraison terminée</Text>
                      </View>
                    ) : (
                      myDriverDeliveredOrders.map((cmd) => (
                        <View key={cmd.id} style={styles.listRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>
                              {cmd.id} • {cmd.qte}× {cmd.type}
                            </Text>
                            <Text style={styles.mutedText}>
                              {cmd.clientNom} • {cmd.distanceKm || 1.5} km • {cmd.date}
                            </Text>
                          </View>
                          <Text style={[styles.priceHighlight, { color: '#4ADE80' }]}>
                            +{(cmd.driverNet || 0).toLocaleString('fr-FR')} F
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* CLIENT : LISTE COMPLÈTE DES VENDEURS DE SA VILLE */}
                {activeViewRole === 'client' && dashboardTab === 'depots' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Vendeurs ({userCity})</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>{filteredDepotsList.length}</Text>
                      </View>
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Quartier ou nom du dépôt..."
                      placeholderTextColor="#64748B"
                      value={searchDepot}
                      onChangeText={setSearchDepot}
                    />

                    {filteredDepotsList.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucun vendeur actif à {userCity}</Text>
                      </View>
                    ) : (
                      filteredDepotsList.map((depot) => {
                        const b6Rech = getVendorUnitPrice(depot, 'B6', 'recharge');
                        const b6Achat = getVendorUnitPrice(depot, 'B6', 'achat');
                        const b12Rech = getVendorUnitPrice(depot, 'B12', 'recharge');
                        return (
                          <View key={depot.id} style={styles.orderCard}>
                            <View style={styles.rowBetween}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.listRowTitle}>{depot.nom}</Text>
                                <Text style={styles.mutedText}>
                                  {depot.adresse} • {depot.deliveryQuote.distanceKm} km (
                                  {depot.deliveryQuote.isExactGps ? 'GPS' : 'Est.'}) • Livraison :{' '}
                                  {depot.deliveryQuote.deliveryFee.toLocaleString('fr-FR')} F
                                </Text>
                              </View>
                              <AnimatedButton
                                style={styles.compactPrimaryBtn}
                                onPress={() => {
                                  setSelectedVendorId(depot.id);
                                  setDashboardTab('order');
                                }}
                              >
                                <Text style={styles.compactPrimaryBtnText}>Commander</Text>
                              </AnimatedButton>
                            </View>

                            <View style={styles.vendorPriceBadgesRow}>
                              <View style={styles.miniPriceTag}>
                                <Text style={styles.miniPriceTagText}>
                                  B6 Rech: {b6Rech.toLocaleString('fr-FR')} F
                                </Text>
                              </View>
                              <View style={styles.miniPriceTag}>
                                <Text style={styles.miniPriceTagText}>
                                  B6 Neuf: {b6Achat.toLocaleString('fr-FR')} F
                                </Text>
                              </View>
                              <View style={styles.miniPriceTag}>
                                <Text style={styles.miniPriceTagText}>
                                  B12 Rech: {b12Rech.toLocaleString('fr-FR')} F
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* CLIENT : COMMANDE */}
                {activeViewRole === 'client' && dashboardTab === 'order' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Commander</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>{userCity}</Text>
                      </View>
                    </View>

                    <Text style={styles.label}>1. Opération</Text>
                    <View style={styles.segmentedRow}>
                      <AnimatedButton
                        containerStyle={{ flex: 1 }}
                        style={[styles.segBtn, operationType === 'recharge' && styles.segBtnActive]}
                        onPress={() => setOperationType('recharge')}
                      >
                        <Text style={[styles.segBtnText, operationType === 'recharge' && styles.segBtnTextActive]}>
                          Recharge
                        </Text>
                      </AnimatedButton>
                      <AnimatedButton
                        containerStyle={{ flex: 1 }}
                        style={[styles.segBtn, operationType === 'achat' && styles.segBtnActive]}
                        onPress={() => setOperationType('achat')}
                      >
                        <Text style={[styles.segBtnText, operationType === 'achat' && styles.segBtnTextActive]}>
                          Bouteille neuve
                        </Text>
                      </AnimatedButton>
                    </View>

                    <Text style={styles.label}>2. Format & Marque</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                      {CYLINDER_TYPES.map((cyl) => {
                        const isSelected = selectedCylinder.id === cyl.id;
                        return (
                          <AnimatedButton
                            key={cyl.id}
                            containerStyle={{ flex: 1 }}
                            style={[styles.formatCard, isSelected && styles.formatCardActive]}
                            onPress={() => setSelectedCylinder(cyl)}
                          >
                            <Text style={[styles.formatTitle, isSelected && { color: '#F97316' }]}>{cyl.id}</Text>
                            <Text style={styles.formatPrice}>{cyl.name.split(' ')[1]}</Text>
                          </AnimatedButton>
                        );
                      })}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {MARQUES_GAZ.map((m) => {
                          const isSelected = selectedMarque.id === m.id;
                          return (
                            <AnimatedButton
                              key={m.id}
                              style={[styles.chip, isSelected && { backgroundColor: m.color, borderColor: m.color }]}
                              onPress={() => setSelectedMarque(m)}
                            >
                              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{m.name}</Text>
                            </AnimatedButton>
                          );
                        })}
                      </View>
                    </ScrollView>

                    <Text style={styles.label}>3. Position & Quartier</Text>
                    <View style={styles.gpsBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.microLabel}>POSITION GPS</Text>
                        <Text style={styles.gpsCoordValue}>
                          {hasValidCoords(clientCoords)
                            ? `${clientCoords.latitude}, ${clientCoords.longitude}`
                            : 'En attente'}
                        </Text>
                      </View>
                      <AnimatedButton
                        style={styles.gpsActionBtn}
                        onPress={() =>
                          captureDeviceGPS({
                            silent: false,
                            fillAddress: true,
                            onCaptured: (coords) => setClientCoords(coords),
                          })
                        }
                        disabled={gpsLoading}
                      >
                        <Text style={styles.gpsActionBtnText}>{gpsLoading ? 'GPS...' : 'Ma position'}</Text>
                      </AnimatedButton>
                    </View>

                    <TextInput
                      style={[styles.input, { marginTop: 8 }]}
                      placeholder="Quartier / point de repère..."
                      placeholderTextColor="#64748B"
                      value={adresseLivraison}
                      onChangeText={setAdresseLivraison}
                    />

                    <Text style={styles.label}>4. Vendeur ({localCityVendors.length})</Text>
                    {localCityVendors.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucun vendeur actif à {userCity}</Text>
                      </View>
                    ) : (
                      <View style={{ gap: 8, marginBottom: 14 }}>
                        {localCityVendors.map((vendor) => {
                          const isChosen = activeOfferVendor?.id === vendor.id;
                          return (
                            <AnimatedButton
                              key={vendor.id}
                              style={[styles.vendorOfferCard, isChosen && styles.vendorOfferCardActive]}
                              onPress={() => setSelectedVendorId(vendor.id)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.listRowTitle, isChosen && { color: '#F97316' }]}>
                                  {vendor.nom}
                                </Text>
                                <Text style={styles.mutedText}>
                                  {vendor.adresse} • {vendor.deliveryQuote.distanceKm} km (
                                  {vendor.deliveryQuote.isExactGps ? 'GPS' : 'Est.'})
                                </Text>
                                <Text style={styles.deliveryEstimateTag}>
                                  Livraison : {vendor.deliveryQuote.deliveryFee.toLocaleString('fr-FR')} FCFA
                                </Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.selectRowPrice}>
                                  {vendor.currentOfferPrice.toLocaleString('fr-FR')} F
                                </Text>
                                <Text style={styles.microLabel}>/ bouteille</Text>
                              </View>
                            </AnimatedButton>
                          );
                        })}
                      </View>
                    )}

                    <Text style={styles.label}>5. Quantité & Réception</Text>
                    <QuantityStepper value={quantite} onChange={setQuantite} />

                    <View style={styles.segmentedRow}>
                      <AnimatedButton
                        containerStyle={{ flex: 1 }}
                        style={[styles.segBtn, deliveryMode === 'livraison' && styles.segBtnActive]}
                        onPress={() => setDeliveryMode('livraison')}
                      >
                        <Text style={[styles.segBtnText, deliveryMode === 'livraison' && styles.segBtnTextActive]}>
                          Livraison ({activeDeliveryQuote.deliveryFee.toLocaleString('fr-FR')} F)
                        </Text>
                      </AnimatedButton>
                      <AnimatedButton
                        containerStyle={{ flex: 1 }}
                        style={[styles.segBtn, deliveryMode === 'retrait' && styles.segBtnActive]}
                        onPress={() => setDeliveryMode('retrait')}
                      >
                        <Text style={[styles.segBtnText, deliveryMode === 'retrait' && styles.segBtnTextActive]}>
                          Retrait (0 F)
                        </Text>
                      </AnimatedButton>
                    </View>

                    <View style={styles.financeSplitBox}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>
                          Gaz ({currentFinancials.qty} × {currentFinancials.unitPrice.toLocaleString('fr-FR')} F)
                        </Text>
                        <Text style={styles.financeValue}>
                          {currentFinancials.gasSubtotal.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.financeLabel}>
                          {deliveryMode === 'livraison'
                            ? `Livraison (${currentFinancials.distanceKm} km)`
                            : 'Retrait au dépôt'}
                        </Text>
                        <Text style={styles.financeValue}>
                          {currentFinancials.deliveryFee === 0
                            ? '0 FCFA'
                            : `${currentFinancials.deliveryFee.toLocaleString('fr-FR')} FCFA`}
                        </Text>
                      </View>
                      <View style={[styles.rowBetween, styles.financeTotalRow]}>
                        <Text style={styles.financeTotalLabel}>Total</Text>
                        <Text style={styles.priceHighlight}>
                          {currentFinancials.totalClient.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                    </View>

                    <AnimatedButton
                      style={[styles.btnPrimary, !activeOfferVendor && { opacity: 0.5 }]}
                      onPress={handleCreateOrder}
                      disabled={loading || !activeOfferVendor}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>
                          Commander • {currentFinancials.totalClient.toLocaleString('fr-FR')} F
                        </Text>
                      )}
                    </AnimatedButton>
                  </View>
                )}

                {/* CLIENT : SUIVI */}
                {activeViewRole === 'client' && dashboardTab === 'orders_list' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Suivi</Text>

                    {orderSuccessBanner !== '' && (
                      <View style={styles.toastSuccess}>
                        <Text style={styles.toastSuccessText}>{orderSuccessBanner}</Text>
                      </View>
                    )}

                    {myClientOrders.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune commande</Text>
                      </View>
                    ) : (
                      myClientOrders.map((cmd) => {
                        const meta = getStatusMeta(cmd);
                        return (
                          <View key={cmd.id} style={styles.orderCard}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.orderId}>{cmd.id}</Text>
                              <View style={[styles.badgePill, { backgroundColor: meta.bg }]}>
                                <Text style={[styles.badgePillText, { color: meta.color }]}>{meta.label}</Text>
                              </View>
                            </View>
                            <Text style={styles.orderMainText}>
                              {cmd.qte}× {cmd.type} ({cmd.operation})
                            </Text>
                            <Text style={styles.mutedText}>
                              {cmd.assignedVendorNom || cmd.targetVendorNom} •{' '}
                              {cmd.deliveryMode === 'livraison'
                                ? `Livraison (${cmd.distanceKm || 1.5} km)`
                                : 'Retrait'}
                            </Text>

                            {cmd.deliveryMode === 'livraison' && cmd.deliveryCode && (
                              <View style={styles.secretCodeBanner}>
                                <Text style={styles.secretCodeBannerTitle}>
                                  CODE DE CONFIRMATION : {cmd.deliveryCode}
                                </Text>
                                <Text style={styles.secretCodeBannerHint}>
                                  {cmd.status === 'delivered'
                                    ? 'Code validé à la livraison.'
                                    : 'Ne communiquez ce code au livreur qu’à la réception de la bouteille.'}
                                </Text>
                              </View>
                            )}

                            <View style={styles.rowBetween}>
                              <Text style={styles.mutedText}>{cmd.date}</Text>
                              <Text style={styles.priceHighlight}>{cmd.total}</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </FadeInView>
            )
          ) : (
            /* ACCUEIL & AUTHENTIFICATION */
            <FadeInView key={currentScreen} style={styles.mainWrapper}>
              {currentScreen === 'welcome' && (
                <View style={styles.welcomeContainer}>
                  <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>Distribution & Livraison de Gaz</Text>
                    <Text style={styles.heroSub}>Choisissez votre profil.</Text>
                  </View>

                  <View style={{ gap: 10 }}>
                    <AnimatedButton style={styles.roleSelectCard} onPress={() => setCurrentScreen('register_client')}>
                      <View>
                        <Text style={styles.roleSelectTitle}>Client</Text>
                        <Text style={styles.roleSelectSub}>Commander du gaz</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </AnimatedButton>

                    <AnimatedButton style={styles.roleSelectCard} onPress={() => setCurrentScreen('register_depot')}>
                      <View>
                        <Text style={styles.roleSelectTitle}>Vendeur</Text>
                        <Text style={styles.roleSelectSub}>Gérer mon dépôt (1 mois gratuit)</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </AnimatedButton>

                    <AnimatedButton style={styles.roleSelectCard} onPress={() => setCurrentScreen('register_livreur')}>
                      <View>
                        <Text style={styles.roleSelectTitle}>Livreur</Text>
                        <Text style={styles.roleSelectSub}>Livrer des commandes</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </AnimatedButton>
                  </View>

                  <AnimatedButton style={styles.btnPrimary} onPress={() => setCurrentScreen('login')}>
                    <Text style={styles.btnPrimaryText}>Connexion</Text>
                  </AnimatedButton>
                </View>
              )}

              {(currentScreen === 'register_client' ||
                currentScreen === 'register_depot' ||
                currentScreen === 'register_livreur') && (
                <View style={styles.cardBox}>
                  <Pressable onPress={() => setCurrentScreen('welcome')} style={styles.backRow}>
                    <Text style={styles.backText}>‹ Retour</Text>
                  </Pressable>

                  <Text style={styles.cardBoxTitle}>
                    {currentScreen === 'register_depot'
                      ? 'Inscription Vendeur'
                      : currentScreen === 'register_livreur'
                      ? 'Inscription Livreur'
                      : 'Inscription Client'}
                  </Text>

                  <Text style={styles.label}>
                    {currentScreen === 'register_depot' ? 'Nom du dépôt' : 'Nom complet'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Koné Moussa"
                    placeholderTextColor="#64748B"
                    value={nom}
                    onChangeText={setNom}
                  />

                  <Text style={styles.label}>Téléphone</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    placeholder="0700000000"
                    placeholderTextColor="#64748B"
                    value={telephone}
                    onChangeText={setTelephone}
                  />

                  <Text style={styles.label}>Ville</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Abidjan, Bouaké, Odienné..."
                    placeholderTextColor="#64748B"
                    value={ville}
                    onChangeText={setVille}
                  />

                  <Text style={styles.label}>Quartier</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Anyama, Yopougon, Angré..."
                    placeholderTextColor="#64748B"
                    value={adresse}
                    onChangeText={setAdresse}
                  />

                  {(currentScreen === 'register_depot' || currentScreen === 'register_client') && (
                    <View style={[styles.gpsBox, { marginBottom: 12 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.microLabel}>POSITION GPS</Text>
                        <Text style={styles.gpsCoordValue}>
                          {hasValidCoords(registerCoords)
                            ? `${registerCoords.latitude}, ${registerCoords.longitude}`
                            : 'Non capturée'}
                        </Text>
                      </View>
                      <AnimatedButton
                        style={styles.gpsActionBtn}
                        onPress={() =>
                          captureDeviceGPS({
                            silent: false,
                            fillAddress: true,
                            onCaptured: (coords) => setRegisterCoords(coords),
                          })
                        }
                        disabled={gpsLoading}
                      >
                        <Text style={styles.gpsActionBtnText}>{gpsLoading ? 'GPS...' : 'Ma position'}</Text>
                      </AnimatedButton>
                    </View>
                  )}

                  {currentScreen === 'register_livreur' && (
                    <>
                      <Text style={styles.label}>Véhicule</Text>
                      <View style={styles.segmentedRow}>
                        {VEHICLE_TYPES.map((v) => (
                          <AnimatedButton
                            key={v}
                            containerStyle={{ flex: 1 }}
                            style={[styles.segBtn, vehicule === v && styles.segBtnActive]}
                            onPress={() => setVehicule(v)}
                          >
                            <Text style={[styles.segBtnText, vehicule === v && styles.segBtnTextActive]}>{v}</Text>
                          </AnimatedButton>
                        ))}
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="email@monan.ci"
                    placeholderTextColor="#64748B"
                    value={email}
                    onChangeText={setEmail}
                  />

                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor="#64748B"
                    value={password}
                    onChangeText={setPassword}
                  />

                  <AnimatedButton
                    style={styles.btnPrimary}
                    onPress={() =>
                      handleRegister(
                        currentScreen === 'register_depot'
                          ? 'depot'
                          : currentScreen === 'register_livreur'
                          ? 'livreur'
                          : 'client'
                      )
                    }
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnPrimaryText}>S'inscrire</Text>}
                  </AnimatedButton>
                </View>
              )}

              {currentScreen === 'login' && (
                <View style={styles.cardBox}>
                  <Pressable onPress={() => setCurrentScreen('welcome')} style={styles.backRow}>
                    <Text style={styles.backText}>‹ Retour</Text>
                  </Pressable>

                  <Text style={styles.cardBoxTitle}>Connexion</Text>

                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="email@monan.ci"
                    placeholderTextColor="#64748B"
                    value={email}
                    onChangeText={setEmail}
                  />

                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor="#64748B"
                    value={password}
                    onChangeText={setPassword}
                  />

                  <AnimatedButton style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnPrimaryText}>Connexion</Text>}
                  </AnimatedButton>
                </View>
              )}
            </FadeInView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* BARRE DE NAVIGATION BASSE FIXE */}
      {user && !isVendorSubscriptionExpired && (
        <View style={styles.bottomTabBar}>
          {getBottomNavItems().map((tab) => {
            const isActive = dashboardTab === tab.id;
            return (
              <Pressable key={tab.id} style={styles.bottomTabItem} onPress={() => setDashboardTab(tab.id)}>
                <View style={[styles.bottomTabIndicator, isActive && styles.bottomTabIndicatorActive]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]}>{tab.label}</Text>
                  {tab.badge > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  splashContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 84, height: 84, marginBottom: 12 },
  splashTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },

  onboardingContainer: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 20, justifyContent: 'space-between' },
  onboardingHeader: { alignItems: 'flex-end', paddingTop: 16 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1E293B' },
  skipBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  onboardingSlideWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  onboardingBadgeBox: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#F97316', marginBottom: 24 },
  onboardingLogo: { width: 52, height: 52 },
  heroBadge: { backgroundColor: 'rgba(249, 115, 22, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 10 },
  heroBadgeText: { color: '#F97316', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  onboardingTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  onboardingSub: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  onboardingFooter: { paddingBottom: 24 },
  paginationDotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 18 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 22, backgroundColor: '#F97316' },
  dotInactive: { width: 6, backgroundColor: '#334155' },
  onboardingBtnRow: { flexDirection: 'row', gap: 10 },

  appBar: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBadge: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  brandLogoImage: { width: 20, height: 20 },
  brandTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  brandSub: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncBtn: { backgroundColor: '#1E293B', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  syncBtnText: { color: '#38BDF8', fontSize: 12, fontWeight: '900' },
  segmentedSwitch: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: '#334155' },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  segmentItemActive: { backgroundColor: '#F97316' },
  segmentText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  segmentTextActive: { color: '#FFFFFF', fontWeight: '800' },

  logoutBtn: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  logoutBtnText: { color: '#F87171', fontSize: 11, fontWeight: '700' },

  scrollContent: { flexGrow: 1, padding: 16 },
  mainWrapper: { flex: 1, justifyContent: 'space-between' },

  profileCard: { backgroundColor: '#0F172A', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1E293B' },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  greetingTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  mutedText: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  gpsBadgeText: { color: '#4ADE80', fontSize: 11, fontWeight: '700', marginTop: 3 },

  walletStrip: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  walletStripDanger: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  walletStripValue: { color: '#4ADE80', fontSize: 17, fontWeight: '900', marginTop: 2 },

  driverBlockedCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  driverBlockedTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  driverBlockedText: { color: '#FCA5A5', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  btnWhatsapp: { backgroundColor: '#16A34A', height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  btnWhatsappText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  secretCodeBanner: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: '#F97316',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  secretCodeBannerTitle: { color: '#F97316', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  secretCodeBannerHint: { color: '#CBD5E1', fontSize: 11, marginTop: 2 },
  secretCodeInput: { marginTop: 6, marginBottom: 6, textAlign: 'center', fontSize: 18, fontWeight: '900', letterSpacing: 6, borderColor: '#F97316' },

  gpsBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  gpsCoordValue: { color: '#E2E8F0', fontSize: 12, fontWeight: '700', marginTop: 2 },
  gpsActionBtn: { backgroundColor: '#0EA5E9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  gpsActionBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  subStrip: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#1E293B', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  microLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  subStripValue: { color: '#4ADE80', fontSize: 14, fontWeight: '800', marginTop: 1 },

  kpiGrid: { flexDirection: 'row', gap: 8 },
  kpiCard: { flex: 1, backgroundColor: '#0F172A', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center' },
  kpiNum: { fontSize: 20, fontWeight: '900', color: '#F97316' },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 2, textAlign: 'center' },

  cardBox: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  cardBoxTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  subCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },

  cityPill: { backgroundColor: 'rgba(249, 115, 22, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 14 },
  cityPillText: { color: '#F97316', fontSize: 11, fontWeight: '800' },

  orderCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155', gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  orderMainText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', marginTop: 2 },
  priceHighlight: { color: '#F97316', fontWeight: '900', fontSize: 14 },
  deliveryEstimateTag: { color: '#38BDF8', fontSize: 11, fontWeight: '700', marginTop: 3 },

  vendorPriceBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  miniPriceTag: { backgroundColor: '#0F172A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  miniPriceTagText: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },

  vendorOfferCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  vendorOfferCardActive: { borderColor: '#F97316', backgroundColor: '#263347' },

  financeSplitBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 5,
  },
  financeLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', flex: 1, paddingRight: 8 },
  financeValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  financeMuted: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  financeTotalRow: { borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 6, marginTop: 2 },
  financeTotalLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  badgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgePillText: { fontSize: 11, fontWeight: '800' },

  dividerSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  driverAssignedStrip: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#0F172A' },
  driverAssignedText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },

  listRowCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  listRowTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  segmentedRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  segBtn: { height: 42, borderRadius: 10, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155', paddingHorizontal: 8 },
  segBtnActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  segBtnText: { fontSize: 12, fontWeight: '700', color: '#CBD5E1' },
  segBtnTextActive: { color: '#FFFFFF', fontWeight: '800' },

  periodRow: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  periodBtn: { height: 38, borderRadius: 9, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155', paddingHorizontal: 4 },
  periodBtnText: { fontSize: 11, fontWeight: '700', color: '#CBD5E1' },

  formatCard: { paddingVertical: 10, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', borderWidth: 1.5, borderColor: '#334155' },
  formatCardActive: { borderColor: '#F97316', backgroundColor: '#263347' },
  formatTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  formatPrice: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 2 },

  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#CBD5E1' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },

  operatorRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  operatorTile: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    position: 'relative',
  },
  operatorTileActive: { borderColor: '#F97316' },
  operatorCheckBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    zIndex: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorCheckText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  operatorTileLogo: { width: '85%', height: 30 },

  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 4, width: 132, justifyContent: 'space-between', marginBottom: 14 },
  stepperBtn: { width: 34, height: 34, backgroundColor: '#F97316', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  stepperBtnDisabled: { backgroundColor: '#334155' },
  stepperBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  stepperValueBox: { flex: 1, alignItems: 'center' },
  stepperValueText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  label: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 6 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14, color: '#FFFFFF', marginBottom: 12 },

  btnPrimary: { backgroundColor: '#F97316', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  btnSecondary: { backgroundColor: '#1E293B', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#334155' },
  btnSecondaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  btnSuccess: { backgroundColor: '#16A34A', height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnSuccessText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  btnDangerOutline: { backgroundColor: 'rgba(239, 68, 68, 0.14)', borderWidth: 1, borderColor: '#EF4444', height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnDangerOutlineText: { color: '#F87171', fontWeight: '800', fontSize: 12 },
  compactPrimaryBtn: { backgroundColor: '#F97316', paddingHorizontal: 14, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  compactSuccessBtn: { backgroundColor: '#16A34A', paddingHorizontal: 14, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  compactPrimaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },

  statusPillDanger: { backgroundColor: 'rgba(239, 68, 68, 0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  statusPillDangerText: { color: '#F87171', fontSize: 10, fontWeight: '800' },
  selectRowCard: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectRowCardActive: { borderColor: '#F97316', backgroundColor: '#263347' },
  selectRowTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  discountBadge: { backgroundColor: 'rgba(74, 222, 128, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountBadgeText: { color: '#4ADE80', fontSize: 10, fontWeight: '800' },
  strikePrice: { color: '#64748B', fontSize: 11, textDecorationLine: 'line-through' },
  selectRowPrice: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  toastSuccess: { backgroundColor: 'rgba(74, 222, 128, 0.16)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.4)', borderRadius: 10, padding: 10, marginBottom: 10 },
  toastSuccessText: { color: '#4ADE80', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  toastWarning: { backgroundColor: 'rgba(56, 189, 248, 0.14)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.4)', borderRadius: 10, padding: 10, marginBottom: 10, marginTop: 4 },
  toastWarningText: { color: '#38BDF8', fontWeight: '700', fontSize: 12, textAlign: 'center' },

  emptyStateBox: { paddingVertical: 24, alignItems: 'center' },
  emptyStateText: { color: '#64748B', fontWeight: '600', fontSize: 13 },

  welcomeContainer: { flex: 1, justifyContent: 'space-between', paddingVertical: 8 },
  heroSection: { marginTop: 8 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', lineHeight: 32 },
  heroSub: { fontSize: 14, color: '#94A3B8', marginTop: 6 },
  roleSelectCard: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleSelectTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  roleSelectSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  chevron: { color: '#F97316', fontSize: 22, fontWeight: '700' },

  backRow: { marginBottom: 12 },
  backText: { color: '#F97316', fontWeight: '700', fontSize: 14 },

  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    flexDirection: 'row',
    height: 62,
    paddingBottom: 6,
  },
  bottomTabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomTabIndicator: { width: 20, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 6 },
  bottomTabIndicatorActive: { backgroundColor: '#F97316' },
  bottomTabLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  bottomTabLabelActive: { color: '#FFFFFF', fontWeight: '800' },
  tabBadge: { backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
});