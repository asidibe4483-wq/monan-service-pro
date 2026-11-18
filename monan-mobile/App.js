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
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_GAS_COMMISSION_RATE = 0.05; // 5 % commission plateforme sur le gaz
const APP_DELIVERY_COMMISSION_RATE = 0.20; // 20 % commission plateforme sur la livraison (100 F / 500 F)
const STANDARD_DELIVERY_FEE = 500; // Frais de livraison client en FCFA

const CITIES = ['Abidjan', 'Bouaké', 'Odienné', 'Yamoussoukro', 'Korhogo', 'San-Pédro'];

const DEFAULT_VENDOR_PRICES = {
  B6: { recharge: '2000', achat: '13000' },
  B12: { recharge: '5500', achat: '25000' },
  B28: { recharge: '13000', achat: '45000' },
};

const calculateOrderFinancials = (unitPrice, quantity, deliveryMode) => {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const gasSubtotal = unitPrice * qty;
  const deliveryFee = deliveryMode === 'livraison' ? STANDARD_DELIVERY_FEE : 0;
  const totalClient = gasSubtotal + deliveryFee;

  const appGasCommission = Math.round(gasSubtotal * APP_GAS_COMMISSION_RATE);
  const appDeliveryCommission = Math.round(deliveryFee * APP_DELIVERY_COMMISSION_RATE);
  const appTotalCommission = appGasCommission + appDeliveryCommission;

  const vendorNet = gasSubtotal - appGasCommission;
  const driverNet = deliveryFee - appDeliveryCommission;

  return {
    qty,
    unitPrice,
    gasSubtotal,
    deliveryFee,
    totalClient,
    appGasCommission,
    appDeliveryCommission,
    appTotalCommission,
    vendorNet,
    driverNet,
  };
};

const getDaysLeftInTrial = (createdAtDate) => {
  if (!createdAtDate) return 30;
  const diffDays = Math.floor((Date.now() - new Date(createdAtDate)) / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - diffDays);
};

const getRemainingSubscriptionDays = (userObj) => {
  if (!userObj) return 0;
  if (userObj.subscriptionExpiresAt) {
    const diffTime = new Date(userObj.subscriptionExpiresAt).getTime() - Date.now();
    return diffTime <= 0 ? 0 : Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return getDaysLeftInTrial(userObj.createdAt);
};

const ROLE_LABELS = {
  client: 'Client',
  depot: 'Vendeur',
  livreur: 'Livreur',
};

const SUBSCRIPTION_PLANS = [
  { id: '1m', label: '1 Mois', days: 30, price: 2000, originalPrice: null, badge: 'Standard' },
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

const VEHICLE_TYPES = ['Moto', 'Tricycle'];

const ONBOARDING_SLIDES = [
  {
    id: '1',
    badge: 'MONAN SERVICE',
    title: 'Le gaz livré chez vous',
    subtitle: 'Comparez les offres des dépôts de votre ville et commandez.',
    icon: require('./assets/splash-icon.png')
  },
  {
    id: '2',
    badge: 'CLIENT',
    title: 'Offres locales en direct',
    subtitle: 'Choisissez le meilleur tarif près de chez vous, avec ou sans livraison.',
    icon: require('./assets/splash-icon.png')
  },
  {
    id: '3',
    badge: 'VENDEUR',
    title: 'Tarifs personnalisés',
    subtitle: 'Fixez vos prix par bouteille et gérez vos commandes.',
    icon: require('./assets/splash-icon.png')
  },
  {
    id: '4',
    badge: 'LIVREUR',
    title: 'Courses rémunérées',
    subtitle: 'Recevez directement votre part sur chaque livraison effectuée.',
    icon: require('./assets/splash-icon.png')
  }
];

const FadeInView = ({ children, style, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
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

const AnimatedButton = ({ onPress, style, containerStyle, children, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, friction: 8, tension: 60, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      style={containerStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
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
      <Pressable style={styles.stepperBtn} onPress={() => onChange((qty + 1).toString())}>
        <Text style={styles.stepperBtnText}>+</Text>
      </Pressable>
    </View>
  );
};

const MARQUES_GAZ = [
  { id: 'total', name: 'TotalEnergies', color: '#F97316' },
  { id: 'shell', name: 'Shell Gas', color: '#1E40AF' },
  { id: 'petro', name: 'Pétro Ivoire', color: '#334155' },
  { id: 'oryx', name: 'Oryx Energies', color: '#0EA5E9' },
  { id: 'petroci', name: 'Pétroci', color: '#16A34A' },
  { id: 'simam', name: 'Simam Gas', color: '#EAB308' },
  { id: 'districom', name: 'Districom', color: '#EF4444' },
  { id: 'ola', name: 'OLA Energy', color: '#991B1B' },
  { id: 'corlay', name: 'Corlay', color: '#15803D' },
];

const CYLINDER_TYPES = [
  { id: 'B6', name: 'B6 (6 kg)', defaultRecharge: 2000, defaultAchat: 13000 },
  { id: 'B12', name: 'B12 (12.5 kg)', defaultRecharge: 5500, defaultAchat: 25000 },
  { id: 'B28', name: 'B28 (28 kg)', defaultRecharge: 13000, defaultAchat: 45000 },
];

const DEFAULT_USERS = [
  {
    id: 'DEP-DEFAULT',
    email: 'vendeur@monan.ci',
    role: 'depot',
    nom: 'Dépôt Angré 8e Tranche',
    telephone: '0707070707',
    ville: 'Abidjan',
    adresse: 'Cocody Angré',
    distanceKm: 0.3,
    createdAt: new Date().toISOString(),
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isSubscribed: true,
    prices: {
      B6: { recharge: '2000', achat: '13000' },
      B12: { recharge: '5500', achat: '25000' },
      B28: { recharge: '13000', achat: '45000' },
    }
  },
  {
    id: 'DEP-02',
    email: 'saintjean@monan.ci',
    role: 'depot',
    nom: 'Dépôt Saint-Jean',
    telephone: '0708020304',
    ville: 'Abidjan',
    adresse: 'Cocody Centre',
    distanceKm: 1.2,
    createdAt: new Date().toISOString(),
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isSubscribed: true,
    prices: {
      B6: { recharge: '2100', achat: '13500' },
      B12: { recharge: '5400', achat: '24500' },
      B28: { recharge: '12800', achat: '44500' },
    }
  },
  {
    id: 'DEP-03',
    email: 'riviera@monan.ci',
    role: 'depot',
    nom: 'Dépôt Riviera 2',
    telephone: '0709030405',
    ville: 'Abidjan',
    adresse: 'Cocody Riviera 2',
    distanceKm: 2.5,
    createdAt: new Date().toISOString(),
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isSubscribed: true,
    prices: {
      B6: { recharge: '1950', achat: '12800' },
      B12: { recharge: '5600', achat: '25000' },
      B28: { recharge: '13200', achat: '45500' },
    }
  },
  {
    id: 'DEP-04',
    email: 'bouake@monan.ci',
    role: 'depot',
    nom: 'Dépôt Air France Bouaké',
    telephone: '0501020304',
    ville: 'Bouaké',
    adresse: 'Air France 1',
    distanceKm: 0.8,
    createdAt: new Date().toISOString(),
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isSubscribed: true,
    prices: {
      B6: { recharge: '2050', achat: '13200' },
      B12: { recharge: '5650', achat: '25500' },
      B28: { recharge: '13500', achat: '46000' },
    }
  },
  {
    id: 'CLI-DEFAULT',
    email: 'client@monan.ci',
    role: 'client',
    nom: 'Kouassi Yves',
    telephone: '0505050505',
    ville: 'Abidjan',
    adresse: 'Angré Star 10',
    createdAt: new Date().toISOString()
  },
  {
    id: 'LIV-DEFAULT',
    email: 'livreur@monan.ci',
    role: 'livreur',
    nom: 'Koné Moussa',
    telephone: '0102030405',
    ville: 'Abidjan',
    adresse: 'Cocody / Angré',
    vehicule: 'Tricycle',
    createdAt: new Date().toISOString()
  }
];

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [user, setUser] = useState(null);
  const [vendorViewMode, setVendorViewMode] = useState('depot');
  const [loading, setLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('home');

  const [selectedPlan, setSelectedPlan] = useState(SUBSCRIPTION_PLANS[1]);
  const [paymentMethod, setPaymentMethod] = useState('Wave');
  const [paymentPhone, setPaymentPhone] = useState('');

  const [registeredUsers, setRegisteredUsers] = useState(DEFAULT_USERS);

  // Formulaire de tarification du vendeur connecté
  const [vendorPricesForm, setVendorPricesForm] = useState(DEFAULT_VENDOR_PRICES);

  // Champs d'inscription / connexion
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [ville, setVille] = useState('Abidjan');
  const [adresse, setAdresse] = useState('');
  const [vehicule, setVehicule] = useState('Moto');

  // Ajout livreur par vendeur
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('Moto');
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState({});

  // Paramètres de commande client
  const [selectedMarque, setSelectedMarque] = useState(MARQUES_GAZ[0]);
  const [selectedCylinder, setSelectedCylinder] = useState(CYLINDER_TYPES[1]);
  const [operationType, setOperationType] = useState('recharge');
  const [deliveryMode, setDeliveryMode] = useState('livraison'); // 'livraison' | 'retrait'
  const [quantite, setQuantite] = useState('1');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(null);

  const [searchDepot, setSearchDepot] = useState('');
  const [orderSuccessBanner, setOrderSuccessBanner] = useState('');

  const [allOrders, setAllOrders] = useState([
    {
      id: 'CMD-801',
      date: new Date().toLocaleDateString('fr-FR'),
      clientId: 'CLI-DEFAULT',
      clientNom: 'Kouassi Yves',
      clientPhone: '0505050505',
      ville: 'Abidjan',
      type: 'TotalEnergies B12 (12.5 kg)',
      operation: 'Recharge',
      deliveryMode: 'livraison',
      qte: 1,
      gasSubtotal: 5500,
      deliveryFee: 500,
      appCommission: 375,
      vendorNet: 5225,
      driverNet: 400,
      total: '6 000 FCFA',
      adresse: 'Angré Star 10',
      targetVendorId: 'DEP-DEFAULT',
      targetVendorNom: 'Dépôt Angré 8e Tranche',
      status: 'available',
      assignedVendorId: null,
      assignedVendorNom: null,
      assignedDriverId: null,
      assignedDriverNom: null,
      assignedDriverPhone: null,
    },
    {
      id: 'CMD-802',
      date: new Date().toLocaleDateString('fr-FR'),
      clientId: 'CLI-OTHER',
      clientNom: 'Mme Traoré',
      clientPhone: '0506070809',
      ville: 'Abidjan',
      type: 'Shell Gas B6 (6 kg)',
      operation: 'Achat Neuf',
      deliveryMode: 'retrait',
      qte: 1,
      gasSubtotal: 13000,
      deliveryFee: 0,
      appCommission: 650,
      vendorNet: 12350,
      driverNet: 0,
      total: '13 000 FCFA',
      adresse: 'Retrait au dépôt',
      targetVendorId: 'DEP-DEFAULT',
      targetVendorNom: 'Dépôt Angré 8e Tranche',
      status: 'available',
      assignedVendorId: null,
      assignedVendorNom: null,
      assignedDriverId: null,
      assignedDriverNom: null,
      assignedDriverPhone: null,
    }
  ]);

  useEffect(() => {
    checkFirstLaunchStatus();
    loadStoredUsers();
    const timer = setTimeout(() => setIsAppReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const loadStoredUsers = async () => {
    try {
      const stored = await AsyncStorage.getItem('@registered_users_v5');
      if (stored) setRegisteredUsers(JSON.parse(stored));
    } catch (e) {}
  };

  const checkFirstLaunchStatus = async () => {
    try {
      const value = await AsyncStorage.getItem('@has_seen_onboarding');
      setHasSeenOnboarding(value !== null);
    } catch (e) {
      setHasSeenOnboarding(false);
    }
  };

  const handleFinishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@has_seen_onboarding', 'true');
    } catch (e) {}
    setHasSeenOnboarding(true);
  };

  useEffect(() => {
    const onBackPress = () => {
      if (!hasSeenOnboarding) {
        if (onboardingStep > 0) {
          setOnboardingStep(prev => prev - 1);
          return true;
        }
        return false;
      }
      if (!user) {
        if (currentScreen !== 'welcome') {
          setCurrentScreen('welcome');
          return true;
        }
        return false;
      }
      if (dashboardTab !== 'home') {
        setDashboardTab('home');
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub?.remove?.();
  }, [hasSeenOnboarding, onboardingStep, user, currentScreen, dashboardTab]);

  const activeViewRole = !user
    ? null
    : user.role === 'depot'
    ? (vendorViewMode === 'client' ? 'client' : 'depot')
    : user.role;

  const userCity = (user?.ville || 'Abidjan').trim();

  const remainingSubDays = user?.role === 'depot' ? getRemainingSubscriptionDays(user) : null;
  const isVendorSubscriptionExpired = user?.role === 'depot' && remainingSubDays <= 0;

  // Extraction du prix configuré par un vendeur pour un format et un type d'opération donnés
  const getVendorUnitPrice = (vendorObj, cylinderId, opType) => {
    const cylMeta = CYLINDER_TYPES.find(c => c.id === cylinderId) || CYLINDER_TYPES[1];
    const customPrices = vendorObj?.prices?.[cylinderId];
    if (customPrices) {
      const parsed = parseInt(opType === 'recharge' ? customPrices.recharge : customPrices.achat, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return opType === 'recharge' ? cylMeta.defaultRecharge : cylMeta.defaultAchat;
  };

  // Liste des vendeurs actifs situés STRICTEMENT dans la même ville que le client
  const localCityVendors = registeredUsers
    .filter(
      (u) =>
        u.role === 'depot' &&
        (u.ville || '').trim().toLowerCase() === userCity.toLowerCase() &&
        getRemainingSubscriptionDays(u) > 0
    )
    .map((v) => ({
      ...v,
      distanceLabel: v.distanceKm ? `${v.distanceKm} km` : 'Proche',
      currentOfferPrice: getVendorUnitPrice(v, selectedCylinder.id, operationType),
    }))
    .sort((a, b) => a.currentOfferPrice - b.currentOfferPrice);

  // Vendeur sélectionné par le client (par défaut l'offre la moins chère de sa ville)
  const activeOfferVendor =
    localCityVendors.find((v) => v.id === selectedVendorId) || localCityVendors[0] || null;

  const activeUnitPrice = activeOfferVendor
    ? activeOfferVendor.currentOfferPrice
    : operationType === 'recharge'
    ? selectedCylinder.defaultRecharge
    : selectedCylinder.defaultAchat;

  const currentFinancials = calculateOrderFinancials(activeUnitPrice, quantite, deliveryMode);

  const switchVendorMode = (targetMode) => {
    if (!user || user.role !== 'depot' || isVendorSubscriptionExpired || vendorViewMode === targetMode) return;
    setVendorViewMode(targetMode);
    setDashboardTab('home');
  };

  const persistUserUpdate = async (updatedUserObj) => {
    setUser(updatedUserObj);
    const updatedList = registeredUsers.map(u =>
      u.email === updatedUserObj.email ? { ...u, ...updatedUserObj } : u
    );
    const finalList = updatedList.some(u => u.email === updatedUserObj.email)
      ? updatedList
      : [...updatedList, updatedUserObj];
    setRegisteredUsers(finalList);
    try {
      await AsyncStorage.setItem('@registered_users_v5', JSON.stringify(finalList));
    } catch (e) {}
  };

  const handleSaveVendorPrices = async () => {
    if (!user || user.role !== 'depot') return;
    const sanitizedPrices = {
      B6: {
        recharge: String(Math.max(500, parseInt(vendorPricesForm.B6?.recharge, 10) || 2000)),
        achat: String(Math.max(1000, parseInt(vendorPricesForm.B6?.achat, 10) || 13000)),
      },
      B12: {
        recharge: String(Math.max(500, parseInt(vendorPricesForm.B12?.recharge, 10) || 5500)),
        achat: String(Math.max(1000, parseInt(vendorPricesForm.B12?.achat, 10) || 25000)),
      },
      B28: {
        recharge: String(Math.max(500, parseInt(vendorPricesForm.B28?.recharge, 10) || 13000)),
        achat: String(Math.max(1000, parseInt(vendorPricesForm.B28?.achat, 10) || 45000)),
      },
    };
    setVendorPricesForm(sanitizedPrices);
    await persistUserUpdate({ ...user, prices: sanitizedPrices });
    Alert.alert('Tarifs enregistrés', `Vos offres pour ${user.ville} sont maintenant visibles par les clients.`);
  };

  const handleRenewSubscription = async () => {
    const phoneToUse = (paymentPhone || user?.telephone || '').trim();
    if (!phoneToUse || phoneToUse.length < 8) {
      Alert.alert('Numéro requis', 'Entrez un numéro Mobile Money valide.');
      return;
    }

    setLoading(true);
    const baseTime = Math.max(
      Date.now(),
      user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).getTime() : 0
    );
    const updatedUser = {
      ...user,
      isSubscribed: true,
      subscriptionExpiresAt: new Date(baseTime + selectedPlan.days * 24 * 60 * 60 * 1000).toISOString(),
      lastPlan: selectedPlan.label
    };

    await persistUserUpdate(updatedUser);
    setVendorViewMode('depot');
    setDashboardTab('home');
    setLoading(false);
    Alert.alert('Abonnement actif', `Forfait ${selectedPlan.label} activé via ${paymentMethod}.`);
  };

  const handleSimulateExpiration = async () => {
    if (!user || user.role !== 'depot') return;
    await persistUserUpdate({
      ...user,
      isSubscribed: false,
      subscriptionExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });
    setVendorViewMode('depot');
    setDashboardTab('home');
  };

  const handleRegister = async (type) => {
    if (!nom || !telephone || !email || !password || !ville.trim()) {
      Alert.alert('Champs requis', 'Complétez les informations obligatoires dont votre ville.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingAccount = registeredUsers.find(u => u.email === cleanEmail);
    if (existingAccount) {
      Alert.alert('Email utilisé', `Déjà associé à un compte ${ROLE_LABELS[existingAccount.role]}.`);
      return;
    }

    setLoading(true);
    const nowIso = new Date().toISOString();
    const cleanCity = ville.trim();
    const newUser = {
      id: `${type === 'depot' ? 'DEP' : type === 'livreur' ? 'LIV' : 'CLI'}-${Math.floor(1000 + Math.random() * 9000)}`,
      nom: type === 'depot' && !nom.trim().toLowerCase().startsWith('dépôt') ? `Dépôt ${nom.trim()}` : nom.trim(),
      email: cleanEmail,
      telephone: telephone.trim(),
      ville: cleanCity,
      adresse: adresse.trim() || cleanCity,
      distanceKm: 0.5,
      role: type,
      vehicule: type === 'livreur' ? vehicule : null,
      createdAt: nowIso,
      subscriptionExpiresAt: type === 'depot' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      isSubscribed: false,
      prices: type === 'depot' ? DEFAULT_VENDOR_PRICES : null,
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    try {
      await AsyncStorage.setItem('@registered_users_v5', JSON.stringify(updatedUsers));
    } catch (e) {}

    if (type === 'depot') {
      setVendorViewMode('depot');
      setVendorPricesForm(DEFAULT_VENDOR_PRICES);
    }

    setUser(newUser);
    setSelectedVendorId(null);
    setPaymentPhone(telephone.trim());
    if (type === 'client' || type === 'depot') setAdresseLivraison(adresse.trim());
    setDashboardTab('home');
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Entrez votre email et mot de passe.');
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    let storedUsers = registeredUsers;
    try {
      const stored = await AsyncStorage.getItem('@registered_users_v5');
      if (stored) {
        storedUsers = JSON.parse(stored);
        setRegisteredUsers(storedUsers);
      }
    } catch (e) {}

    const foundUser = storedUsers.find(u => u.email === cleanEmail);
    if (!foundUser) {
      setLoading(false);
      Alert.alert('Compte introuvable', 'Vérifiez votre email ou créez un compte.');
      return;
    }

    const userData = {
      ...foundUser,
      ville: foundUser.ville || 'Abidjan',
      prices: foundUser.prices || DEFAULT_VENDOR_PRICES,
      subscriptionExpiresAt:
        foundUser.subscriptionExpiresAt ||
        (foundUser.role === 'depot'
          ? new Date(new Date(foundUser.createdAt || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null)
    };

    setUser(userData);
    setSelectedVendorId(null);
    setPaymentPhone(userData.telephone || '');
    if (userData.role === 'depot') {
      setVendorViewMode('depot');
      setVendorPricesForm(userData.prices || DEFAULT_VENDOR_PRICES);
    }
    if (userData.adresse && (userData.role === 'client' || userData.role === 'depot')) {
      setAdresseLivraison(userData.adresse);
    }
    setDashboardTab('home');
    setLoading(false);
  };

  const handleAddDriverFromVendor = async () => {
    if (user?.role !== 'depot') return;
    if (!newDriverName.trim() || !newDriverPhone.trim()) {
      Alert.alert('Champs requis', 'Renseignez le nom et le téléphone.');
      return;
    }

    const driverEmail = `${newDriverPhone.trim()}@livreur.monan.ci`;
    if (registeredUsers.some(u => u.email === driverEmail)) {
      Alert.alert('Déjà inscrit', 'Ce numéro est déjà enregistré.');
      return;
    }

    const driverObj = {
      id: `LIV-${Math.floor(1000 + Math.random() * 9000)}`,
      nom: newDriverName.trim(),
      telephone: newDriverPhone.trim(),
      email: driverEmail,
      ville: user?.ville || 'Abidjan',
      adresse: user?.adresse || user?.ville || 'Abidjan',
      role: 'livreur',
      vehicule: newDriverVehicle,
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...registeredUsers, driverObj];
    setRegisteredUsers(updatedUsers);
    try {
      await AsyncStorage.setItem('@registered_users_v5', JSON.stringify(updatedUsers));
    } catch (e) {}

    setNewDriverName('');
    setNewDriverPhone('');
    Alert.alert('Livreur ajouté', `${driverObj.nom} est disponible à ${driverObj.ville}.`);
  };

  const handleCreateOrder = () => {
    if (activeViewRole !== 'client') return;
    if (!activeOfferVendor) {
      Alert.alert('Aucun vendeur', `Aucun dépôt actif disponible à ${userCity}.`);
      return;
    }
    if (deliveryMode === 'livraison' && !adresseLivraison.trim()) {
      Alert.alert('Adresse requise', 'Indiquez votre quartier ou point de repère pour la livraison.');
      return;
    }

    setLoading(true);
    const fin = currentFinancials;
    const newCmdId = `CMD-${Math.floor(100 + Math.random() * 900)}`;

    const newCmd = {
      id: newCmdId,
      date: new Date().toLocaleDateString('fr-FR'),
      clientId: user.id,
      clientNom: user.nom || 'Client',
      clientPhone: user.telephone || '',
      ville: userCity,
      type: `${selectedMarque.name} ${selectedCylinder.name}`,
      operation: operationType === 'recharge' ? 'Recharge' : 'Achat Neuf',
      deliveryMode,
      qte: fin.qty,
      gasSubtotal: fin.gasSubtotal,
      deliveryFee: fin.deliveryFee,
      appCommission: fin.appTotalCommission,
      vendorNet: fin.vendorNet,
      driverNet: fin.driverNet,
      total: `${fin.totalClient.toLocaleString('fr-FR')} FCFA`,
      adresse: deliveryMode === 'livraison' ? adresseLivraison.trim() : `Retrait : ${activeOfferVendor.nom}`,
      targetVendorId: activeOfferVendor.id,
      targetVendorNom: activeOfferVendor.nom,
      status: 'available',
      assignedVendorId: null,
      assignedVendorNom: null,
      assignedDriverId: null,
      assignedDriverNom: null,
      assignedDriverPhone: null,
    };

    setAllOrders(prev => [newCmd, ...prev]);
    setOrderSuccessBanner(`Commande ${newCmdId} envoyée à ${activeOfferVendor.nom}.`);
    setDashboardTab('orders_list');
    setLoading(false);
  };

  const handleAcceptOrder = (orderId) => {
    if (user?.role !== 'depot' || activeViewRole !== 'depot' || isVendorSubscriptionExpired) return;
    setAllOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? { ...o, status: 'accepted', assignedVendorId: user.id, assignedVendorNom: user.nom || 'Dépôt' }
          : o
      )
    );
    setDashboardTab('my_deliveries');
  };

  const handleCompletePickupOrder = (orderId) => {
    if (user?.role !== 'depot' || activeViewRole !== 'depot' || isVendorSubscriptionExpired) return;
    setAllOrders(prev =>
      prev.map(o => (o.id === orderId && o.assignedVendorId === user.id ? { ...o, status: 'delivered' } : o))
    );
  };

  const handleAssignDriverToOrder = (orderId) => {
    if (user?.role !== 'depot' || activeViewRole !== 'depot' || isVendorSubscriptionExpired) return;
    if (cityDrivers.length === 0) {
      Alert.alert('Aucun livreur', `Ajoutez un livreur dans votre ville (${userCity}).`);
      return;
    }

    const chosenDriverId = selectedDriverByOrder[orderId] || cityDrivers[0].id;
    const driver = cityDrivers.find(d => d.id === chosenDriverId) || cityDrivers[0];

    setAllOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: 'in_delivery',
              assignedDriverId: driver.id,
              assignedDriverNom: driver.nom,
              assignedDriverPhone: driver.telephone
            }
          : o
      )
    );
  };

  const handleDriverClaimOrder = (orderId) => {
    if (user?.role !== 'livreur' || activeViewRole !== 'livreur') return;
    setAllOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: 'in_delivery',
              assignedDriverId: user.id,
              assignedDriverNom: user.nom || 'Livreur',
              assignedDriverPhone: user.telephone || ''
            }
          : o
      )
    );
    setDashboardTab('driver_active');
  };

  const handleDriverConfirmDelivery = (orderId) => {
    if (user?.role !== 'livreur' || activeViewRole !== 'livreur') return;
    setAllOrders(prev =>
      prev.map(o => (o.id === orderId && o.assignedDriverId === user.id ? { ...o, status: 'delivered' } : o))
    );
  };

  const handleLogout = () => {
    setUser(null);
    setVendorViewMode('depot');
    setSelectedVendorId(null);
    setEmail('');
    setPassword('');
    setCurrentScreen('welcome');
    setDashboardTab('home');
  };

  const filteredDepotsList = localCityVendors.filter(d =>
    d.nom.toLowerCase().includes(searchDepot.toLowerCase()) ||
    (d.adresse || '').toLowerCase().includes(searchDepot.toLowerCase())
  );

  const cityDrivers = registeredUsers.filter(
    u => u.role === 'livreur' && (u.ville || '').trim().toLowerCase() === userCity.toLowerCase()
  );

  const availableOrdersForVendors = activeViewRole === 'depot'
    ? allOrders.filter(
        c =>
          c.status === 'available' &&
          (c.ville || '').trim().toLowerCase() === userCity.toLowerCase() &&
          (!c.targetVendorId || c.targetVendorId === user?.id)
      )
    : [];

  const myVendorDeliveries = activeViewRole === 'depot'
    ? allOrders.filter(c => c.assignedVendorId === user?.id && (c.status === 'accepted' || c.status === 'in_delivery'))
    : [];

  const availableOrdersForDrivers = activeViewRole === 'livreur'
    ? allOrders.filter(
        c =>
          c.status === 'accepted' &&
          c.deliveryMode === 'livraison' &&
          !c.assignedDriverId &&
          (c.ville || '').trim().toLowerCase() === userCity.toLowerCase()
      )
    : [];

  const myDriverActiveOrders = activeViewRole === 'livreur'
    ? allOrders.filter(c => c.assignedDriverId === user?.id && c.status === 'in_delivery')
    : [];

  const myDriverDeliveredOrders = activeViewRole === 'livreur'
    ? allOrders.filter(c => c.assignedDriverId === user?.id && c.status === 'delivered')
    : [];

  const myClientOrders = activeViewRole === 'client'
    ? allOrders.filter(c => c.clientId === user?.id)
    : [];

  const getRoleSubtitle = () => {
    if (!user) return 'Distribution de gaz';
    if (user.role === 'depot') return activeViewRole === 'depot' ? `Vendeur • ${userCity}` : `Client • ${userCity}`;
    if (user.role === 'livreur') return `Livreur • ${userCity}`;
    return `Client • ${userCity}`;
  };

  const getStatusMeta = (cmd) => {
    if (cmd.status === 'delivered') {
      return {
        label: cmd.deliveryMode === 'retrait' ? 'Retirée' : 'Livrée',
        color: '#4ADE80',
        bg: 'rgba(74, 222, 128, 0.14)'
      };
    }
    if (cmd.status === 'in_delivery') {
      return {
        label: `En route • ${cmd.assignedDriverNom}`,
        color: '#38BDF8',
        bg: 'rgba(56, 189, 248, 0.14)'
      };
    }
    if (cmd.status === 'accepted') {
      return {
        label: cmd.deliveryMode === 'retrait' ? `Prête au dépôt • ${cmd.assignedVendorNom}` : `Validée • ${cmd.assignedVendorNom}`,
        color: '#FBBF24',
        bg: 'rgba(251, 191, 36, 0.14)'
      };
    }
    return { label: 'En attente', color: '#F97316', bg: 'rgba(249, 115, 22, 0.14)' };
  };

  const getBottomNavItems = () => {
    if (activeViewRole === 'depot') {
      return [
        { id: 'home', label: 'Accueil', badge: 0 },
        { id: 'vendor_live_orders', label: 'Commandes', badge: availableOrdersForVendors.length },
        { id: 'my_deliveries', label: 'En cours', badge: myVendorDeliveries.length },
        { id: 'vendor_drivers', label: 'Livreurs', badge: 0 },
        { id: 'pricing', label: 'Tarifs', badge: 0 },
      ];
    }
    if (activeViewRole === 'livreur') {
      return [
        { id: 'home', label: 'Accueil', badge: 0 },
        { id: 'driver_available', label: 'Courses', badge: availableOrdersForDrivers.length },
        { id: 'driver_active', label: 'En cours', badge: myDriverActiveOrders.length },
        { id: 'driver_history', label: 'Livrées', badge: 0 },
      ];
    }
    return [
      { id: 'home', label: 'Accueil', badge: 0 },
      { id: 'depots', label: 'Offres', badge: localCityVendors.length },
      { id: 'order', label: 'Commander', badge: 0 },
      { id: 'orders_list', label: 'Suivi', badge: myClientOrders.filter(o => o.status !== 'delivered').length },
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
              <View key={index} style={[styles.dot, onboardingStep === index ? styles.dotActive : styles.dotInactive]} />
            ))}
          </View>

          <View style={styles.onboardingBtnRow}>
            {onboardingStep > 0 && (
              <AnimatedButton style={styles.btnSecondary} onPress={() => setOnboardingStep(prev => prev - 1)}>
                <Text style={styles.btnSecondaryText}>Retour</Text>
              </AnimatedButton>
            )}
            <AnimatedButton
              containerStyle={{ flex: 1 }}
              style={styles.btnPrimary}
              onPress={() => (isLastSlide ? handleFinishOnboarding() : setOnboardingStep(prev => prev + 1))}
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
          contentContainerStyle={[styles.scrollContent, user && !isVendorSubscriptionExpired && { paddingBottom: 88 }]}
          showsVerticalScrollIndicator={false}
        >
          {user ? (
            isVendorSubscriptionExpired ? (
              /* BLOCAGE ABONNEMENT EXPIRÉ */
              <FadeInView key="subscription-lock" style={styles.mainWrapper}>
                <View style={styles.cardBox}>
                  <View style={styles.statusPillDanger}>
                    <Text style={styles.statusPillDangerText}>ABONNEMENT EXPIRÉ</Text>
                  </View>
                  <Text style={styles.cardBoxTitle}>Renouveler l'accès</Text>
                  <Text style={styles.mutedText}>
                    Choisissez une formule pour réactiver votre dépôt ({user.nom}).
                  </Text>

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
                              <Text style={styles.strikePrice}>{plan.originalPrice.toLocaleString('fr-FR')} F</Text>
                            )}
                            <Text style={styles.selectRowPrice}>{plan.price.toLocaleString('fr-FR')} F</Text>
                          </View>
                        </AnimatedButton>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Moyen de paiement</Text>
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

                  <Text style={styles.label}>Numéro {paymentMethod}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    placeholder="0707070707"
                    placeholderTextColor="#64748B"
                    value={paymentPhone}
                    onChangeText={setPaymentPhone}
                  />

                  <AnimatedButton style={styles.btnPrimary} onPress={handleRenewSubscription} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>
                        Payer {selectedPlan.price.toLocaleString('fr-FR')} F
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
                          {userCity} • {user.adresse}
                        </Text>
                      </View>
                    </View>

                    {user.role === 'depot' && (
                      <View style={styles.subStrip}>
                        <View>
                          <Text style={styles.microLabel}>ABONNEMENT</Text>
                          <Text style={styles.subStripValue}>{remainingSubDays} j restants</Text>
                        </View>
                        <AnimatedButton style={styles.ghostDangerBtn} onPress={handleSimulateExpiration}>
                          <Text style={styles.ghostDangerText}>Simuler fin</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {/* INDICATEURS CLÉS */}
                    <View style={styles.kpiGrid}>
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
                            <Text style={styles.kpiNum}>{cityDrivers.length}</Text>
                            <Text style={styles.kpiLabel}>Livreurs ({userCity})</Text>
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
                            <Text style={styles.kpiLabel}>Dépôts à {userCity}</Text>
                          </Pressable>
                          <Pressable style={styles.kpiCard} onPress={() => setDashboardTab('orders_list')}>
                            <Text style={styles.kpiNum}>{myClientOrders.length}</Text>
                            <Text style={styles.kpiLabel}>Commandes</Text>
                          </Pressable>
                        </>
                      )}
                    </View>

                    {/* ACTIONS RAPIDES */}
                    {activeViewRole === 'depot' && (
                      <View style={{ gap: 10 }}>
                        <AnimatedButton style={styles.btnPrimary} onPress={() => setDashboardTab('vendor_live_orders')}>
                          <Text style={styles.btnPrimaryText}>Commandes ({availableOrdersForVendors.length})</Text>
                        </AnimatedButton>
                        <AnimatedButton style={styles.btnSecondary} onPress={() => setDashboardTab('pricing')}>
                          <Text style={styles.btnSecondaryText}>Configurer mes tarifs</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {activeViewRole === 'livreur' && (
                      <View style={{ gap: 10 }}>
                        <AnimatedButton style={styles.btnPrimary} onPress={() => setDashboardTab('driver_available')}>
                          <Text style={styles.btnPrimaryText}>Courses à {userCity} ({availableOrdersForDrivers.length})</Text>
                        </AnimatedButton>
                        <AnimatedButton style={styles.btnSecondary} onPress={() => setDashboardTab('driver_active')}>
                          <Text style={styles.btnSecondaryText}>Mes livraisons</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {activeViewRole === 'client' && (
                      <View style={{ gap: 10 }}>
                        <AnimatedButton style={styles.btnPrimary} onPress={() => setDashboardTab('order')}>
                          <Text style={styles.btnPrimaryText}>Commander du gaz</Text>
                        </AnimatedButton>
                        <AnimatedButton style={styles.btnSecondary} onPress={() => setDashboardTab('depots')}>
                          <Text style={styles.btnSecondaryText}>Comparer les offres ({userCity})</Text>
                        </AnimatedButton>
                      </View>
                    )}
                  </View>
                )}

                {/* VENDEUR : COMMANDES DISPONIBLES */}
                {activeViewRole === 'depot' && dashboardTab === 'vendor_live_orders' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Commandes ({userCity})</Text>
                    {availableOrdersForVendors.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune commande en attente</Text>
                      </View>
                    ) : (
                      availableOrdersForVendors.map((order) => (
                        <View key={order.id} style={styles.orderCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.orderId}>{order.id}</Text>
                            <View style={[
                              styles.badgePill,
                              { backgroundColor: order.deliveryMode === 'livraison' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 191, 36, 0.15)' }
                            ]}>
                              <Text style={[
                                styles.badgePillText,
                                { color: order.deliveryMode === 'livraison' ? '#38BDF8' : '#FBBF24' }
                              ]}>
                                {order.deliveryMode === 'livraison' ? 'Livraison' : 'Retrait dépôt'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.orderMainText}>{order.qte}× {order.type} • {order.operation}</Text>
                          <Text style={styles.mutedText}>{order.clientNom} ({order.clientPhone})</Text>
                          <Text style={styles.mutedText}>{order.adresse}</Text>

                          {/* VENTILATION FINANCIÈRE VENDEUR */}
                          <View style={styles.financeSplitBox}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.financeLabel}>Total client</Text>
                              <Text style={styles.financeValue}>{order.total}</Text>
                            </View>
                            <View style={styles.rowBetween}>
                              <Text style={styles.financeLabel}>Votre part nette (95 % gaz)</Text>
                              <Text style={[styles.financeValue, { color: '#4ADE80' }]}>
                                {(order.vendorNet || 0).toLocaleString('fr-FR')} FCFA
                              </Text>
                            </View>
                            {order.deliveryMode === 'livraison' && (
                              <View style={styles.rowBetween}>
                                <Text style={styles.financeLabel}>Part livreur</Text>
                                <Text style={[styles.financeValue, { color: '#38BDF8' }]}>
                                  {(order.driverNet || 0).toLocaleString('fr-FR')} FCFA
                                </Text>
                              </View>
                            )}
                            <View style={styles.rowBetween}>
                              <Text style={styles.financeLabel}>Commission MONAN</Text>
                              <Text style={styles.financeMuted}>
                                {(order.appCommission || 0).toLocaleString('fr-FR')} FCFA
                              </Text>
                            </View>
                          </View>

                          <AnimatedButton style={styles.btnSuccess} onPress={() => handleAcceptOrder(order.id)}>
                            <Text style={styles.btnSuccessText}>Accepter la commande</Text>
                          </AnimatedButton>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* VENDEUR : LIVRAISONS & RETRAITS */}
                {activeViewRole === 'depot' && dashboardTab === 'my_deliveries' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Commandes en cours</Text>
                    {myVendorDeliveries.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune commande active</Text>
                      </View>
                    ) : (
                      myVendorDeliveries.map((order) => {
                        const activeSelectedDriverId = selectedDriverByOrder[order.id] || cityDrivers[0]?.id;
                        const isAssigned = order.status === 'in_delivery';
                        const isPickup = order.deliveryMode === 'retrait';

                        return (
                          <View key={order.id} style={styles.orderCard}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.orderId}>{order.id}</Text>
                              <View style={[
                                styles.badgePill,
                                { backgroundColor: isPickup ? 'rgba(74, 222, 128, 0.15)' : isAssigned ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 191, 36, 0.15)' }
                              ]}>
                                <Text style={[
                                  styles.badgePillText,
                                  { color: isPickup ? '#4ADE80' : isAssigned ? '#38BDF8' : '#FBBF24' }
                                ]}>
                                  {isPickup ? 'Retrait dépôt' : isAssigned ? 'En route' : 'À assigner'}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.orderMainText}>{order.qte}× {order.type}</Text>
                            <Text style={styles.mutedText}>{order.clientNom} • {order.adresse}</Text>
                            <Text style={styles.priceHighlight}>
                              Votre part : {(order.vendorNet || 0).toLocaleString('fr-FR')} FCFA
                            </Text>

                            {isPickup ? (
                              <AnimatedButton style={styles.btnSuccess} onPress={() => handleCompletePickupOrder(order.id)}>
                                <Text style={styles.btnSuccessText}>Confirmer retrait client</Text>
                              </AnimatedButton>
                            ) : !isAssigned ? (
                              <View style={styles.dividerSection}>
                                <Text style={styles.microLabel}>
                                  CHOISIR UN LIVREUR À {userCity.toUpperCase()} (GAIN : {(order.driverNet || 400).toLocaleString('fr-FR')} F)
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, marginBottom: 10 }}>
                                  <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {cityDrivers.map((drv) => {
                                      const isChosen = activeSelectedDriverId === drv.id;
                                      return (
                                        <AnimatedButton
                                          key={drv.id}
                                          style={[styles.chip, isChosen && styles.chipActive]}
                                          onPress={() => setSelectedDriverByOrder(prev => ({ ...prev, [order.id]: drv.id }))}
                                        >
                                          <Text style={[styles.chipText, isChosen && styles.chipTextActive]}>
                                            {drv.nom} ({drv.vehicule || 'Moto'})
                                          </Text>
                                        </AnimatedButton>
                                      );
                                    })}
                                  </View>
                                </ScrollView>

                                <AnimatedButton style={styles.btnPrimary} onPress={() => handleAssignDriverToOrder(order.id)}>
                                  <Text style={styles.btnPrimaryText}>Assigner le livreur</Text>
                                </AnimatedButton>
                              </View>
                            ) : (
                              <View style={styles.driverAssignedStrip}>
                                <Text style={styles.driverAssignedText}>
                                  Livreur : {order.assignedDriverNom} ({order.assignedDriverPhone}) • Part : {(order.driverNet || 400).toLocaleString('fr-FR')} F
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
                    <Text style={styles.cardBoxTitle}>Livreurs à {userCity} ({cityDrivers.length})</Text>

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
                            <Text style={[styles.segBtnText, newDriverVehicle === v && styles.segBtnTextActive]}>{v}</Text>
                          </AnimatedButton>
                        ))}
                      </View>
                      <AnimatedButton style={styles.btnPrimary} onPress={handleAddDriverFromVendor}>
                        <Text style={styles.btnPrimaryText}>Ajouter un livreur</Text>
                      </AnimatedButton>
                    </View>

                    {cityDrivers.map((drv) => {
                      const activeCount = allOrders.filter(
                        o => o.assignedDriverId === drv.id && o.status === 'in_delivery'
                      ).length;

                      return (
                        <View key={drv.id} style={styles.listRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>{drv.nom}</Text>
                            <Text style={styles.mutedText}>{drv.telephone} • {drv.vehicule || 'Moto'}</Text>
                          </View>
                          <View style={[
                            styles.badgePill,
                            { backgroundColor: activeCount > 0 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(74, 222, 128, 0.15)' }
                          ]}>
                            <Text style={[styles.badgePillText, { color: activeCount > 0 ? '#F97316' : '#4ADE80' }]}>
                              {activeCount > 0 ? 'En course' : 'Libre'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* VENDEUR : TARIFS PERSONNALISÉS */}
                {activeViewRole === 'depot' && dashboardTab === 'pricing' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Mes Tarifs ({userCity})</Text>
                    <Text style={styles.mutedText}>
                      Ces prix s'affichent directement aux clients de {userCity} lors de leur commande.
                    </Text>

                    <View style={{ marginTop: 12 }}>
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
                                    [fmt]: { ...vendorPricesForm[fmt], recharge: val }
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
                                    [fmt]: { ...vendorPricesForm[fmt], achat: val }
                                  })
                                }
                              />
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>

                    <AnimatedButton style={styles.btnPrimary} onPress={handleSaveVendorPrices}>
                      <Text style={styles.btnPrimaryText}>Publier mes tarifs</Text>
                    </AnimatedButton>
                  </View>
                )}

                {/* LIVREUR : COURSES DISPONIBLES DANS SA VILLE */}
                {activeViewRole === 'livreur' && dashboardTab === 'driver_available' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Courses disponibles ({userCity})</Text>
                    {availableOrdersForDrivers.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune livraison disponible à {userCity}</Text>
                      </View>
                    ) : (
                      availableOrdersForDrivers.map((order) => (
                        <View key={order.id} style={styles.orderCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.orderId}>{order.id}</Text>
                            <View style={[styles.badgePill, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
                              <Text style={[styles.badgePillText, { color: '#4ADE80' }]}>
                                Gain : {(order.driverNet || 400).toLocaleString('fr-FR')} F
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.orderMainText}>{order.qte}× {order.type}</Text>
                          <Text style={styles.mutedText}>Dépôt : {order.assignedVendorNom}</Text>
                          <Text style={styles.mutedText}>Destination : {order.adresse}</Text>
                          <Text style={styles.priceHighlight}>À encaisser : {order.total}</Text>

                          <AnimatedButton style={styles.btnSuccess} onPress={() => handleDriverClaimOrder(order.id)}>
                            <Text style={styles.btnSuccessText}>Accepter la course</Text>
                          </AnimatedButton>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* LIVREUR : EN COURS */}
                {activeViewRole === 'livreur' && dashboardTab === 'driver_active' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Livraisons en cours</Text>
                    {myDriverActiveOrders.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune course en cours</Text>
                      </View>
                    ) : (
                      myDriverActiveOrders.map((order) => (
                        <View key={order.id} style={styles.orderCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.orderId}>{order.id}</Text>
                            <Text style={[styles.priceHighlight, { color: '#4ADE80' }]}>
                              Votre part : {(order.driverNet || 400).toLocaleString('fr-FR')} F
                            </Text>
                          </View>
                          <Text style={styles.orderMainText}>{order.qte}× {order.type} ({order.operation})</Text>
                          <Text style={styles.mutedText}>{order.clientNom} • {order.clientPhone}</Text>
                          <Text style={styles.mutedText}>{order.adresse}</Text>
                          <Text style={styles.mutedText}>Total client : {order.total}</Text>

                          <AnimatedButton style={styles.btnSuccess} onPress={() => handleDriverConfirmDelivery(order.id)}>
                            <Text style={styles.btnSuccessText}>Confirmer la livraison</Text>
                          </AnimatedButton>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* LIVREUR : HISTORIQUE */}
                {activeViewRole === 'livreur' && dashboardTab === 'driver_history' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Courses livrées</Text>
                    {myDriverDeliveredOrders.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune livraison terminée</Text>
                      </View>
                    ) : (
                      myDriverDeliveredOrders.map((cmd) => (
                        <View key={cmd.id} style={styles.listRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>{cmd.id} • {cmd.qte}× {cmd.type}</Text>
                            <Text style={styles.mutedText}>{cmd.clientNom} • {cmd.date}</Text>
                          </View>
                          <Text style={[styles.priceHighlight, { color: '#4ADE80' }]}>
                            +{(cmd.driverNet || 400).toLocaleString('fr-FR')} F
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* CLIENT : OFFRES DES DÉPÔTS DE SA VILLE */}
                {activeViewRole === 'client' && dashboardTab === 'depots' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Dépôts à {userCity}</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>{userCity}</Text>
                      </View>
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Filtrer par quartier ou nom de dépôt..."
                      placeholderTextColor="#64748B"
                      value={searchDepot}
                      onChangeText={setSearchDepot}
                    />

                    {filteredDepotsList.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucun vendeur enregistré à {userCity}</Text>
                      </View>
                    ) : (
                      filteredDepotsList.map((depot) => {
                        const b6Rech = getVendorUnitPrice(depot, 'B6', 'recharge');
                        const b12Rech = getVendorUnitPrice(depot, 'B12', 'recharge');
                        return (
                          <View key={depot.id} style={styles.orderCard}>
                            <View style={styles.rowBetween}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.listRowTitle}>{depot.nom}</Text>
                                <Text style={styles.mutedText}>{depot.adresse} • {depot.distanceLabel}</Text>
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
                                <Text style={styles.miniPriceTagText}>B6 Rech: {b6Rech.toLocaleString('fr-FR')} F</Text>
                              </View>
                              <View style={styles.miniPriceTag}>
                                <Text style={styles.miniPriceTagText}>B12 Rech: {b12Rech.toLocaleString('fr-FR')} F</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* CLIENT : COMMANDE AVEC COMPARATEUR D'OFFRES VENDEURS & LIVRAISON */}
                {activeViewRole === 'client' && dashboardTab === 'order' && (
                  <View style={styles.cardBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardBoxTitle}>Commander</Text>
                      <View style={styles.cityPill}>
                        <Text style={styles.cityPillText}>Ville : {userCity}</Text>
                      </View>
                    </View>

                    <Text style={styles.label}>1. Type d'opération</Text>
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

                    {/* OFFRES DES VENDEURS DE LA VILLE DU CLIENT */}
                    <Text style={styles.label}>3. Offres des vendeurs à {userCity}</Text>
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
                                  {vendor.adresse} • {vendor.distanceLabel}
                                </Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.selectRowPrice}>
                                  {vendor.currentOfferPrice.toLocaleString('fr-FR')} F
                                </Text>
                                <Text style={styles.microLabel}>/ unité</Text>
                              </View>
                            </AnimatedButton>
                          );
                        })}
                      </View>
                    )}

                    <Text style={styles.label}>4. Quantité & Mode de réception</Text>
                    <QuantityStepper value={quantite} onChange={setQuantite} />

                    <View style={styles.segmentedRow}>
                      <AnimatedButton
                        containerStyle={{ flex: 1 }}
                        style={[styles.segBtn, deliveryMode === 'livraison' && styles.segBtnActive]}
                        onPress={() => setDeliveryMode('livraison')}
                      >
                        <Text style={[styles.segBtnText, deliveryMode === 'livraison' && styles.segBtnTextActive]}>
                          Livraison (+{STANDARD_DELIVERY_FEE} F)
                        </Text>
                      </AnimatedButton>
                      <AnimatedButton
                        containerStyle={{ flex: 1 }}
                        style={[styles.segBtn, deliveryMode === 'retrait' && styles.segBtnActive]}
                        onPress={() => setDeliveryMode('retrait')}
                      >
                        <Text style={[styles.segBtnText, deliveryMode === 'retrait' && styles.segBtnTextActive]}>
                          Retrait dépôt (0 F)
                        </Text>
                      </AnimatedButton>
                    </View>

                    {deliveryMode === 'livraison' && (
                      <>
                        <Text style={styles.label}>Adresse de livraison ({userCity})</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Quartier, rue, repère..."
                          placeholderTextColor="#64748B"
                          value={adresseLivraison}
                          onChangeText={setAdresseLivraison}
                        />
                      </>
                    )}

                    {/* RÉCAPITULATIF CHIFFRÉ & VENTILATION */}
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
                        <Text style={styles.financeLabel}>Frais de livraison</Text>
                        <Text style={styles.financeValue}>
                          {currentFinancials.deliveryFee === 0
                            ? 'Gratuit (Retrait)'
                            : `${currentFinancials.deliveryFee.toLocaleString('fr-FR')} FCFA`}
                        </Text>
                      </View>
                      <View style={[styles.rowBetween, styles.financeTotalRow]}>
                        <Text style={styles.financeTotalLabel}>Total à payer</Text>
                        <Text style={styles.priceHighlight}>
                          {currentFinancials.totalClient.toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>
                      <Text style={styles.financeNote}>
                        Répartition : Vendeur {currentFinancials.vendorNet.toLocaleString('fr-FR')} F
                        {deliveryMode === 'livraison'
                          ? ` • Livreur ${currentFinancials.driverNet.toLocaleString('fr-FR')} F`
                          : ''}
                        {` • Commission MONAN ${currentFinancials.appTotalCommission.toLocaleString('fr-FR')} F`}
                      </Text>
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
                          Valider • {currentFinancials.totalClient.toLocaleString('fr-FR')} F
                        </Text>
                      )}
                    </AnimatedButton>
                  </View>
                )}

                {/* CLIENT : SUIVI */}
                {activeViewRole === 'client' && dashboardTab === 'orders_list' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Mes commandes</Text>

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
                            <Text style={styles.orderMainText}>{cmd.qte}× {cmd.type} ({cmd.operation})</Text>
                            <Text style={styles.mutedText}>
                              Dépôt : {cmd.assignedVendorNom || cmd.targetVendorNom} • {cmd.deliveryMode === 'livraison' ? 'Livraison' : 'Retrait'}
                            </Text>
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
                    <Text style={styles.heroSub}>Créez un profil ou connectez-vous.</Text>
                  </View>

                  <View style={{ gap: 10 }}>
                    <AnimatedButton style={styles.roleSelectCard} onPress={() => setCurrentScreen('register_client')}>
                      <View>
                        <Text style={styles.roleSelectTitle}>Client</Text>
                        <Text style={styles.roleSelectSub}>Comparer les prix et commander</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </AnimatedButton>

                    <AnimatedButton style={styles.roleSelectCard} onPress={() => setCurrentScreen('register_depot')}>
                      <View>
                        <Text style={styles.roleSelectTitle}>Vendeur</Text>
                        <Text style={styles.roleSelectSub}>Gérer un dépôt et ses tarifs</Text>
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

              {(currentScreen === 'register_client' || currentScreen === 'register_depot' || currentScreen === 'register_livreur') && (
                <View style={styles.cardBox}>
                  <Pressable onPress={() => setCurrentScreen('welcome')} style={styles.backRow}>
                    <Text style={styles.backText}>‹ Retour</Text>
                  </Pressable>

                  <Text style={styles.cardBoxTitle}>
                    {currentScreen === 'register_depot'
                      ? 'Compte Vendeur'
                      : currentScreen === 'register_livreur'
                      ? 'Compte Livreur'
                      : 'Compte Client'}
                  </Text>

                  <Text style={styles.label}>
                    {currentScreen === 'register_depot' ? 'Nom du dépôt' : 'Nom complet'}
                  </Text>
                  <TextInput style={styles.input} placeholder="Koné Moussa" placeholderTextColor="#64748B" value={nom} onChangeText={setNom} />

                  <Text style={styles.label}>Téléphone</Text>
                  <TextInput style={styles.input} keyboardType="phone-pad" placeholder="0700000000" placeholderTextColor="#64748B" value={telephone} onChangeText={setTelephone} />

                  <Text style={styles.label}>Ville</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {CITIES.map((c) => {
                        const isSelected = ville.toLowerCase() === c.toLowerCase();
                        return (
                          <AnimatedButton
                            key={c}
                            style={[styles.chip, isSelected && styles.chipActive]}
                            onPress={() => setVille(c)}
                          >
                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{c}</Text>
                          </AnimatedButton>
                        );
                      })}
                    </View>
                  </ScrollView>

                  <Text style={styles.label}>
                    {currentScreen === 'register_livreur' ? 'Zone d’activité' : 'Quartier / Adresse'}
                  </Text>
                  <TextInput style={styles.input} placeholder="Ex : Angré 8e Tranche" placeholderTextColor="#64748B" value={adresse} onChangeText={setAdresse} />

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
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@monan.ci" placeholderTextColor="#64748B" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#64748B" value={password} onChangeText={setPassword} />

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
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnPrimaryText}>Créer le compte</Text>}
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
              <Pressable
                key={tab.id}
                style={styles.bottomTabItem}
                onPress={() => setDashboardTab(tab.id)}
              >
                <View style={[styles.bottomTabIndicator, isActive && styles.bottomTabIndicatorActive]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]}>
                    {tab.label}
                  </Text>
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
    borderBottomColor: '#1E293B'
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBadge: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  brandLogoImage: { width: 20, height: 20 },
  brandTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  brandSub: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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

  subStrip: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#1E293B', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  microLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  subStripValue: { color: '#4ADE80', fontSize: 14, fontWeight: '800', marginTop: 1 },
  ghostDangerBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  ghostDangerText: { color: '#F87171', fontSize: 11, fontWeight: '700' },

  kpiGrid: { flexDirection: 'row', gap: 8 },
  kpiCard: { flex: 1, backgroundColor: '#0F172A', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center' },
  kpiNum: { fontSize: 20, fontWeight: '900', color: '#F97316' },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 2, textAlign: 'center' },

  cardBox: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  cardBoxTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  subCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },

  cityPill: { backgroundColor: 'rgba(249, 115, 22, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 14 },
  cityPillText: { color: '#F97316', fontSize: 11, fontWeight: '800' },

  orderCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155', gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  orderMainText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', marginTop: 2 },
  priceHighlight: { color: '#F97316', fontWeight: '900', fontSize: 14 },

  vendorPriceBadgesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
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
  vendorOfferCardActive: {
    borderColor: '#F97316',
    backgroundColor: '#263347',
  },

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
  financeLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  financeValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  financeMuted: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  financeTotalRow: { borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 6, marginTop: 2 },
  financeTotalLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  financeNote: { color: '#64748B', fontSize: 10, marginTop: 4 },

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
  compactPrimaryBtn: { backgroundColor: '#F97316', paddingHorizontal: 14, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
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

  toastSuccess: { backgroundColor: 'rgba(74, 222, 128, 0.14)', borderRadius: 10, padding: 10, marginBottom: 12 },
  toastSuccessText: { color: '#4ADE80', fontWeight: '700', fontSize: 12, textAlign: 'center' },

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
    paddingBottom: 6
  },
  bottomTabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomTabIndicator: { width: 20, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 6 },
  bottomTabIndicatorActive: { backgroundColor: '#F97316' },
  bottomTabLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  bottomTabLabelActive: { color: '#FFFFFF', fontWeight: '800' },
  tabBadge: { backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' }
});