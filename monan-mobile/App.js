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
  {
    id: 'wave',
    name: 'Wave',
    shortLabel: 'Wave',
    logo: require('./assets/wave.jpeg'),
  },
  {
    id: 'orange',
    name: 'Orange Money',
    shortLabel: 'Orange',
    logo: require('./assets/Orange.jpeg'),
  },
  {
    id: 'mtn',
    name: 'MTN MoMo',
    shortLabel: 'MTN MoMo',
    logo: require('./assets/MTN.jpeg'),
  },
  {
    id: 'moov',
    name: 'Moov Money',
    shortLabel: 'Moov',
    logo: require('./assets/Moov.jpeg'),
  },
];

const VEHICLE_TYPES = ['Moto', 'Tricycle'];

const ONBOARDING_SLIDES = [
  {
    id: '1',
    badge: 'MONAN SERVICE',
    title: 'Le gaz livré chez vous',
    subtitle: 'Commandez, gérez votre dépôt ou livrez en toute simplicité.',
    icon: require('./assets/splash-icon.png')
  },
  {
    id: '2',
    badge: 'CLIENT',
    title: 'Commande rapide',
    subtitle: 'Choisissez votre bouteille et suivez le livreur en direct.',
    icon: require('./assets/splash-icon.png')
  },
  {
    id: '3',
    badge: 'VENDEUR',
    title: 'Gestion de dépôt',
    subtitle: 'Acceptez les commandes et pilotez vos livraisons.',
    icon: require('./assets/splash-icon.png')
  },
  {
    id: '4',
    badge: 'LIVREUR',
    title: 'Courses libres',
    subtitle: 'Prenez les livraisons disponibles autour de vous.',
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

const AnimatedButton = ({ onPress, style, children, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, friction: 8, tension: 60, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} disabled={disabled}>
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
  { id: 'B6', name: 'B6 (6 kg)', priceRecharge: 2000, priceAchat: 13000 },
  { id: 'B12', name: 'B12 (12.5 kg)', priceRecharge: 5500, priceAchat: 25000 },
  { id: 'B28', name: 'B28 (28 kg)', priceRecharge: 13000, priceAchat: 45000 },
];

const INITIAL_DEPOTS = [
  { id: 'DEP-DEFAULT', nom: 'Dépôt Angré 8e Tranche', distanceKm: 0.3, distance: '0.3 km', quartier: 'Cocody Angré', telephone: '0707070707' },
  { id: 'DEP-02', nom: 'Dépôt Saint-Jean', distanceKm: 1.2, distance: '1.2 km', quartier: 'Cocody Centre', telephone: '0708020304' },
  { id: 'DEP-03', nom: 'Dépôt Riviera 2', distanceKm: 2.5, distance: '2.5 km', quartier: 'Cocody Riviera', telephone: '0709030405' },
  { id: 'DEP-04', nom: 'Dépôt Yopougon Maroc', distanceKm: 5.8, distance: '5.8 km', quartier: 'Yopougon', telephone: '0501020304' },
];

const DEFAULT_USERS = [
  {
    id: 'DEP-DEFAULT',
    email: 'vendeur@monan.ci',
    role: 'depot',
    nom: 'Dépôt Angré',
    telephone: '0707070707',
    adresse: 'Cocody Angré',
    createdAt: new Date().toISOString(),
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isSubscribed: true
  },
  {
    id: 'CLI-DEFAULT',
    email: 'client@monan.ci',
    role: 'client',
    nom: 'Kouassi Yves',
    telephone: '0505050505',
    adresse: 'Angré Star 10',
    createdAt: new Date().toISOString()
  },
  {
    id: 'LIV-DEFAULT',
    email: 'livreur@monan.ci',
    role: 'livreur',
    nom: 'Koné Moussa',
    telephone: '0102030405',
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
  const [vehicule, setVehicule] = useState('Moto');

  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('Moto');
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState({});

  const [selectedMarque, setSelectedMarque] = useState(MARQUES_GAZ[0]);
  const [selectedCylinder, setSelectedCylinder] = useState(CYLINDER_TYPES[1]);
  const [operationType, setOperationType] = useState('recharge');
  const [quantite, setQuantite] = useState('1');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [selectedDepotTarget, setSelectedDepotTarget] = useState(null);

  const [searchDepot, setSearchDepot] = useState('');
  const [depotsList, setDepotsList] = useState(INITIAL_DEPOTS);
  const [orderSuccessBanner, setOrderSuccessBanner] = useState('');

  const [allOrders, setAllOrders] = useState([
    {
      id: 'CMD-801',
      date: new Date().toLocaleDateString('fr-FR'),
      clientId: 'CLI-DEFAULT',
      clientNom: 'Kouassi Yves',
      clientPhone: '0505050505',
      type: 'TotalEnergies B12 (12.5 kg)',
      operation: 'Recharge',
      qte: 1,
      total: '5 500 FCFA',
      adresse: 'Angré Star 10',
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
      type: 'Shell Gas B6 (6 kg)',
      operation: 'Achat Neuf',
      qte: 2,
      total: '26 000 FCFA',
      adresse: 'Riviera 3 Cap Sud',
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
      const stored = await AsyncStorage.getItem('@registered_users_v4');
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

  const remainingSubDays = user?.role === 'depot' ? getRemainingSubscriptionDays(user) : null;
  const isVendorSubscriptionExpired = user?.role === 'depot' && remainingSubDays <= 0;

  const activeFormatPrices = vendorPrices[selectedCylinder.id] || {
    recharge: selectedCylinder.priceRecharge,
    achat: selectedCylinder.priceAchat
  };
  const currentUnitPrice = operationType === 'recharge'
    ? (parseInt(activeFormatPrices.recharge, 10) || selectedCylinder.priceRecharge)
    : (parseInt(activeFormatPrices.achat, 10) || selectedCylinder.priceAchat);

  const estimatedTotal = (parseInt(quantite, 10) || 1) * currentUnitPrice;

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
      await AsyncStorage.setItem('@registered_users_v4', JSON.stringify(finalList));
    } catch (e) {}
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
    if (!nom || !telephone || !email || !password) {
      Alert.alert('Champs requis', 'Complétez les informations obligatoires.');
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
    const newUser = {
      id: `${type === 'depot' ? 'DEP' : type === 'livreur' ? 'LIV' : 'CLI'}-${Math.floor(1000 + Math.random() * 9000)}`,
      nom: nom.trim(),
      email: cleanEmail,
      telephone: telephone.trim(),
      adresse: adresse.trim() || 'Abidjan',
      role: type,
      vehicule: type === 'livreur' ? vehicule : null,
      createdAt: nowIso,
      subscriptionExpiresAt: type === 'depot' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      isSubscribed: false
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    try {
      await AsyncStorage.setItem('@registered_users_v4', JSON.stringify(updatedUsers));
    } catch (e) {}

    if (type === 'depot') {
      setDepotsList(prev => [
        {
          id: newUser.id,
          nom: `Dépôt ${nom.trim()}`,
          distanceKm: 0.1,
          distance: '0.1 km',
          quartier: adresse.trim() || 'Abidjan',
          telephone: telephone.trim()
        },
        ...prev
      ]);
      setVendorViewMode('depot');
    }

    setUser(newUser);
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
      const stored = await AsyncStorage.getItem('@registered_users_v4');
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
      subscriptionExpiresAt:
        foundUser.subscriptionExpiresAt ||
        (foundUser.role === 'depot'
          ? new Date(new Date(foundUser.createdAt || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null)
    };

    setUser(userData);
    setPaymentPhone(userData.telephone || '');
    if (userData.role === 'depot') setVendorViewMode('depot');
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
      adresse: user?.adresse || 'Abidjan',
      role: 'livreur',
      vehicule: newDriverVehicle,
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...registeredUsers, driverObj];
    setRegisteredUsers(updatedUsers);
    try {
      await AsyncStorage.setItem('@registered_users_v4', JSON.stringify(updatedUsers));
    } catch (e) {}

    setNewDriverName('');
    setNewDriverPhone('');
    Alert.alert('Livreur ajouté', `${driverObj.nom} est disponible pour vos courses.`);
  };

  const handleCreateOrder = () => {
    if (activeViewRole !== 'client') return;
    if (!adresseLivraison.trim()) {
      Alert.alert('Adresse requise', 'Indiquez le lieu de livraison.');
      return;
    }

    setLoading(true);
    const qteNum = parseInt(quantite, 10) || 1;
    const newCmdId = `CMD-${Math.floor(100 + Math.random() * 900)}`;

    const newCmd = {
      id: newCmdId,
      date: new Date().toLocaleDateString('fr-FR'),
      clientId: user.id,
      clientNom: user.nom || 'Client',
      clientPhone: user.telephone || '',
      type: `${selectedMarque.name} ${selectedCylinder.name}`,
      operation: operationType === 'recharge' ? 'Recharge' : 'Achat Neuf',
      qte: qteNum,
      status: 'available',
      assignedVendorId: null,
      assignedVendorNom: null,
      assignedDriverId: null,
      assignedDriverNom: null,
      assignedDriverPhone: null,
      total: `${estimatedTotal.toLocaleString('fr-FR')} FCFA`,
      adresse: adresseLivraison.trim(),
      depotCible: selectedDepotTarget ? selectedDepotTarget.nom : 'Dépôt proche'
    };

    setAllOrders(prev => [newCmd, ...prev]);
    setOrderSuccessBanner(`Commande ${newCmdId} envoyée.`);
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

  const handleAssignDriverToOrder = (orderId) => {
    if (user?.role !== 'depot' || activeViewRole !== 'depot' || isVendorSubscriptionExpired) return;
    if (independentDrivers.length === 0) return;

    const chosenDriverId = selectedDriverByOrder[orderId] || independentDrivers[0].id;
    const driver = independentDrivers.find(d => d.id === chosenDriverId) || independentDrivers[0];

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
    setEmail('');
    setPassword('');
    setCurrentScreen('welcome');
    setDashboardTab('home');
  };

  const sortedAndFilteredDepots = [...depotsList]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .filter(d =>
      d.nom.toLowerCase().includes(searchDepot.toLowerCase()) ||
      d.quartier.toLowerCase().includes(searchDepot.toLowerCase())
    );

  const independentDrivers = registeredUsers.filter(u => u.role === 'livreur');
  const availableOrdersForVendors = activeViewRole === 'depot' ? allOrders.filter(c => c.status === 'available') : [];
  const myVendorDeliveries = activeViewRole === 'depot'
    ? allOrders.filter(c => c.assignedVendorId === user?.id && (c.status === 'accepted' || c.status === 'in_delivery'))
    : [];
  const availableOrdersForDrivers = activeViewRole === 'livreur'
    ? allOrders.filter(c => c.status === 'accepted' && !c.assignedDriverId)
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
    if (user.role === 'depot') return activeViewRole === 'depot' ? 'Espace Vendeur' : 'Mode Client';
    if (user.role === 'livreur') return 'Livreur indépendant';
    return 'Espace Client';
  };

  const getStatusMeta = (cmd) => {
    if (cmd.status === 'delivered') return { label: 'Livrée', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.14)' };
    if (cmd.status === 'in_delivery') {
      return {
        label: `En route • ${cmd.assignedDriverNom}`,
        color: '#38BDF8',
        bg: 'rgba(56, 189, 248, 0.14)'
      };
    }
    if (cmd.status === 'accepted') {
      return {
        label: `Validée • ${cmd.assignedVendorNom}`,
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
        { id: 'my_deliveries', label: 'Livraisons', badge: myVendorDeliveries.length },
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
      { id: 'depots', label: 'Dépôts', badge: 0 },
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
              style={[styles.btnPrimary, { flex: 1 }]}
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
              /* BLOCAGE ABONNEMENT EXPIRÉ AVEC LOGOS OPÉRATEURS (.jpeg) */
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

                  <Text style={styles.label}>Opérateur Mobile Money</Text>
                  <View style={styles.operatorGrid}>
                    {PAYMENT_OPERATORS.map((op) => {
                      const isSelected = paymentMethod === op.name;
                      return (
                        <AnimatedButton
                          key={op.id}
                          style={[styles.operatorCard, isSelected && styles.operatorCardActive]}
                          onPress={() => setPaymentMethod(op.name)}
                        >
                          <View style={styles.operatorLogoWrapper}>
                            <Image source={op.logo} style={styles.operatorLogoImg} resizeMode="cover" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={1}
                              style={[styles.operatorName, isSelected && { color: '#FFFFFF' }]}
                            >
                              {op.shortLabel}
                            </Text>
                          </View>
                          <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
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
                          {user.role === 'depot'
                            ? (activeViewRole === 'depot' ? 'Dépôt actif' : 'Achat personnel')
                            : user.role === 'livreur'
                            ? `${user.vehicule || 'Moto'} • ${user.adresse}`
                            : user.adresse}
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
                            <Text style={styles.kpiNum}>{independentDrivers.length}</Text>
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
                            <Text style={styles.kpiNum}>{sortedAndFilteredDepots.length}</Text>
                            <Text style={styles.kpiLabel}>Dépôts</Text>
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
                        <AnimatedButton style={styles.btnSecondary} onPress={() => setDashboardTab('my_deliveries')}>
                          <Text style={styles.btnSecondaryText}>Livraisons</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {activeViewRole === 'livreur' && (
                      <View style={{ gap: 10 }}>
                        <AnimatedButton style={styles.btnPrimary} onPress={() => setDashboardTab('driver_available')}>
                          <Text style={styles.btnPrimaryText}>Courses ({availableOrdersForDrivers.length})</Text>
                        </AnimatedButton>
                        <AnimatedButton style={styles.btnSecondary} onPress={() => setDashboardTab('driver_active')}>
                          <Text style={styles.btnSecondaryText}>Mes livraisons</Text>
                        </AnimatedButton>
                      </View>
                    )}

                    {activeViewRole === 'client' && (
                      <View style={{ gap: 10 }}>
                        <AnimatedButton style={styles.btnPrimary} onPress={() => setDashboardTab('order')}>
                          <Text style={styles.btnPrimaryText}>Commander</Text>
                        </AnimatedButton>
                        <AnimatedButton style={styles.btnSecondary} onPress={() => setDashboardTab('depots')}>
                          <Text style={styles.btnSecondaryText}>Dépôts proches</Text>
                        </AnimatedButton>
                      </View>
                    )}
                  </View>
                )}

                {/* VENDEUR : COMMANDES DISPONIBLES */}
                {activeViewRole === 'depot' && dashboardTab === 'vendor_live_orders' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Commandes</Text>
                    {availableOrdersForVendors.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune commande</Text>
                      </View>
                    ) : (
                      availableOrdersForVendors.map((order) => (
                        <View key={order.id} style={styles.orderCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.orderId}>{order.id}</Text>
                            <Text style={styles.priceHighlight}>{order.total}</Text>
                          </View>
                          <Text style={styles.orderMainText}>{order.qte}× {order.type} • {order.operation}</Text>
                          <Text style={styles.mutedText}>{order.clientNom} ({order.clientPhone})</Text>
                          <Text style={styles.mutedText}>{order.adresse}</Text>

                          <AnimatedButton style={styles.btnSuccess} onPress={() => handleAcceptOrder(order.id)}>
                            <Text style={styles.btnSuccessText}>Accepter</Text>
                          </AnimatedButton>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* VENDEUR : LIVRAISONS & ASSIGNATION */}
                {activeViewRole === 'depot' && dashboardTab === 'my_deliveries' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Livraisons</Text>
                    {myVendorDeliveries.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune livraison</Text>
                      </View>
                    ) : (
                      myVendorDeliveries.map((order) => {
                        const activeSelectedDriverId = selectedDriverByOrder[order.id] || independentDrivers[0]?.id;
                        const isAssigned = order.status === 'in_delivery';

                        return (
                          <View key={order.id} style={styles.orderCard}>
                            <View style={styles.rowBetween}>
                              <Text style={styles.orderId}>{order.id}</Text>
                              <View style={[styles.badgePill, { backgroundColor: isAssigned ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 191, 36, 0.15)' }]}>
                                <Text style={[styles.badgePillText, { color: isAssigned ? '#38BDF8' : '#FBBF24' }]}>
                                  {isAssigned ? 'En route' : 'À assigner'}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.orderMainText}>{order.qte}× {order.type}</Text>
                            <Text style={styles.mutedText}>{order.clientNom} • {order.adresse}</Text>
                            <Text style={styles.priceHighlight}>{order.total}</Text>

                            {!isAssigned ? (
                              <View style={styles.dividerSection}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                  <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {independentDrivers.map((drv) => {
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
                                  <Text style={styles.btnPrimaryText}>Assigner</Text>
                                </AnimatedButton>
                              </View>
                            ) : (
                              <View style={styles.driverAssignedStrip}>
                                <Text style={styles.driverAssignedText}>
                                  {order.assignedDriverNom} • {order.assignedDriverPhone}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* VENDEUR : LIVREURS INDÉPENDANTS */}
                {activeViewRole === 'depot' && dashboardTab === 'vendor_drivers' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Livreurs ({independentDrivers.length})</Text>

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
                            style={[styles.segBtn, newDriverVehicle === v && styles.segBtnActive]}
                            onPress={() => setNewDriverVehicle(v)}
                          >
                            <Text style={[styles.segBtnText, newDriverVehicle === v && styles.segBtnTextActive]}>{v}</Text>
                          </AnimatedButton>
                        ))}
                      </View>
                      <AnimatedButton style={styles.btnPrimary} onPress={handleAddDriverFromVendor}>
                        <Text style={styles.btnPrimaryText}>Ajouter</Text>
                      </AnimatedButton>
                    </View>

                    {independentDrivers.map((drv) => {
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

                {/* VENDEUR : TARIFS */}
                {activeViewRole === 'depot' && dashboardTab === 'pricing' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Tarifs (FCFA)</Text>

                    {['B6', 'B12', 'B28'].map((fmt) => (
                      <View key={fmt} style={{ marginBottom: 12 }}>
                        <Text style={styles.microLabel}>FORMAT {fmt}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Recharge</Text>
                            <TextInput
                              style={styles.input}
                              keyboardType="numeric"
                              value={vendorPrices[fmt].recharge}
                              onChangeText={(val) =>
                                setVendorPrices({ ...vendorPrices, [fmt]: { ...vendorPrices[fmt], recharge: val } })
                              }
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Achat</Text>
                            <TextInput
                              style={styles.input}
                              keyboardType="numeric"
                              value={vendorPrices[fmt].achat}
                              onChangeText={(val) =>
                                setVendorPrices({ ...vendorPrices, [fmt]: { ...vendorPrices[fmt], achat: val } })
                              }
                            />
                          </View>
                        </View>
                      </View>
                    ))}

                    <AnimatedButton style={styles.btnPrimary} onPress={() => Alert.alert('Enregistré', 'Tarifs mis à jour.')}>
                      <Text style={styles.btnPrimaryText}>Enregistrer</Text>
                    </AnimatedButton>
                  </View>
                )}

                {/* LIVREUR : COURSES DISPONIBLES */}
                {activeViewRole === 'livreur' && dashboardTab === 'driver_available' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Courses disponibles</Text>
                    {availableOrdersForDrivers.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>Aucune course</Text>
                      </View>
                    ) : (
                      availableOrdersForDrivers.map((order) => (
                        <View key={order.id} style={styles.orderCard}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.orderId}>{order.id}</Text>
                            <Text style={styles.priceHighlight}>{order.total}</Text>
                          </View>
                          <Text style={styles.orderMainText}>{order.qte}× {order.type}</Text>
                          <Text style={styles.mutedText}>Retrait : {order.assignedVendorNom}</Text>
                          <Text style={styles.mutedText}>Livraison : {order.adresse}</Text>

                          <AnimatedButton style={styles.btnSuccess} onPress={() => handleDriverClaimOrder(order.id)}>
                            <Text style={styles.btnSuccessText}>Prendre</Text>
                          </AnimatedButton>
                        </View>
                      ))
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
                            <Text style={styles.orderId}>{order.id}</Text>
                            <Text style={styles.priceHighlight}>{order.total}</Text>
                          </View>
                          <Text style={styles.orderMainText}>{order.qte}× {order.type} ({order.operation})</Text>
                          <Text style={styles.mutedText}>{order.clientNom} • {order.clientPhone}</Text>
                          <Text style={styles.mutedText}>{order.adresse}</Text>

                          <AnimatedButton style={styles.btnSuccess} onPress={() => handleDriverConfirmDelivery(order.id)}>
                            <Text style={styles.btnSuccessText}>Livré</Text>
                          </AnimatedButton>
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
                        <Text style={styles.emptyStateText}>Aucune livraison</Text>
                      </View>
                    ) : (
                      myDriverDeliveredOrders.map((cmd) => (
                        <View key={cmd.id} style={styles.listRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>{cmd.id} • {cmd.qte}× {cmd.type}</Text>
                            <Text style={styles.mutedText}>{cmd.clientNom} • {cmd.date}</Text>
                          </View>
                          <Text style={styles.priceHighlight}>{cmd.total}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* CLIENT : DÉPÔTS PROCHES */}
                {activeViewRole === 'client' && dashboardTab === 'depots' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Dépôts</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Rechercher un quartier..."
                      placeholderTextColor="#64748B"
                      value={searchDepot}
                      onChangeText={setSearchDepot}
                    />

                    {sortedAndFilteredDepots.map((depot) => (
                      <View key={depot.id} style={styles.listRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listRowTitle}>{depot.nom}</Text>
                          <Text style={styles.mutedText}>{depot.quartier} • {depot.distance}</Text>
                        </View>
                        <AnimatedButton
                          style={styles.compactPrimaryBtn}
                          onPress={() => {
                            setSelectedDepotTarget(depot);
                            setAdresseLivraison(depot.quartier);
                            setDashboardTab('order');
                          }}
                        >
                          <Text style={styles.compactPrimaryBtnText}>Choisir</Text>
                        </AnimatedButton>
                      </View>
                    ))}
                  </View>
                )}

                {/* CLIENT : COMMANDE UNIFIÉE */}
                {activeViewRole === 'client' && dashboardTab === 'order' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Commander</Text>

                    {selectedDepotTarget && (
                      <View style={styles.targetDepotChip}>
                        <Text style={styles.targetDepotText}>
                          {selectedDepotTarget.nom} ({selectedDepotTarget.distance})
                        </Text>
                        <Pressable onPress={() => setSelectedDepotTarget(null)}>
                          <Text style={{ color: '#F97316', fontWeight: '800', fontSize: 12 }}>✕</Text>
                        </Pressable>
                      </View>
                    )}

                    <Text style={styles.label}>Type</Text>
                    <View style={styles.segmentedRow}>
                      <AnimatedButton
                        style={[styles.segBtn, operationType === 'recharge' && styles.segBtnActive]}
                        onPress={() => setOperationType('recharge')}
                      >
                        <Text style={[styles.segBtnText, operationType === 'recharge' && styles.segBtnTextActive]}>
                          Recharge
                        </Text>
                      </AnimatedButton>
                      <AnimatedButton
                        style={[styles.segBtn, operationType === 'achat' && styles.segBtnActive]}
                        onPress={() => setOperationType('achat')}
                      >
                        <Text style={[styles.segBtnText, operationType === 'achat' && styles.segBtnTextActive]}>
                          Bouteille neuve
                        </Text>
                      </AnimatedButton>
                    </View>

                    <Text style={styles.label}>Format</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                      {CYLINDER_TYPES.map((cyl) => {
                        const isSelected = selectedCylinder.id === cyl.id;
                        const activePrice = operationType === 'recharge'
                          ? (parseInt(vendorPrices[cyl.id]?.recharge, 10) || cyl.priceRecharge)
                          : (parseInt(vendorPrices[cyl.id]?.achat, 10) || cyl.priceAchat);

                        return (
                          <AnimatedButton
                            key={cyl.id}
                            style={[styles.formatCard, isSelected && styles.formatCardActive]}
                            onPress={() => setSelectedCylinder(cyl)}
                          >
                            <Text style={[styles.formatTitle, isSelected && { color: '#F97316' }]}>{cyl.id}</Text>
                            <Text style={styles.formatPrice}>{activePrice.toLocaleString('fr-FR')} F</Text>
                          </AnimatedButton>
                        );
                      })}
                    </View>

                    <Text style={styles.label}>Marque</Text>
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

                    <Text style={styles.label}>Quantité</Text>
                    <QuantityStepper value={quantite} onChange={setQuantite} />

                    <Text style={styles.label}>Adresse de livraison</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Quartier, repère..."
                      placeholderTextColor="#64748B"
                      value={adresseLivraison}
                      onChangeText={setAdresseLivraison}
                    />

                    <AnimatedButton style={styles.btnPrimary} onPress={handleCreateOrder} disabled={loading}>
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>
                          Commander • {estimatedTotal.toLocaleString('fr-FR')} F
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
                        <Text style={styles.roleSelectSub}>Commander du gaz</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </AnimatedButton>

                    <AnimatedButton style={styles.roleSelectCard} onPress={() => setCurrentScreen('register_depot')}>
                      <View>
                        <Text style={styles.roleSelectTitle}>Vendeur</Text>
                        <Text style={styles.roleSelectSub}>Gérer un dépôt</Text>
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

                  <Text style={styles.label}>
                    {currentScreen === 'register_livreur' ? 'Zone' : 'Adresse'}
                  </Text>
                  <TextInput style={styles.input} placeholder="Cocody Angré" placeholderTextColor="#64748B" value={adresse} onChangeText={setAdresse} />

                  {currentScreen === 'register_livreur' && (
                    <>
                      <Text style={styles.label}>Véhicule</Text>
                      <View style={styles.segmentedRow}>
                        {VEHICLE_TYPES.map((v) => (
                          <AnimatedButton
                            key={v}
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
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 2 },

  cardBox: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  cardBoxTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  subCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },

  orderCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155', gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  orderMainText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', marginTop: 2 },
  priceHighlight: { color: '#F97316', fontWeight: '900', fontSize: 14 },

  badgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgePillText: { fontSize: 11, fontWeight: '800' },

  dividerSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  driverAssignedStrip: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#0F172A' },
  driverAssignedText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },

  listRowCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  listRowTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  targetDepotChip: { backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F97316' },
  targetDepotText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  segmentedRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  segBtn: { flex: 1, height: 42, borderRadius: 10, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  segBtnActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  segBtnText: { fontSize: 12, fontWeight: '700', color: '#CBD5E1' },
  segBtnTextActive: { color: '#FFFFFF', fontWeight: '800' },

  formatCard: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', borderWidth: 1.5, borderColor: '#334155' },
  formatCardActive: { borderColor: '#F97316', backgroundColor: '#263347' },
  formatTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  formatPrice: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 2 },

  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#CBD5E1' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },

  operatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  operatorCard: {
    width: '48.5%',
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  operatorCardActive: {
    borderColor: '#F97316',
    backgroundColor: '#263347',
  },
  operatorLogoWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  operatorLogoImg: {
    width: '100%',
    height: '100%',
  },
  operatorName: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#F97316',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
  },

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

  emptyStateBox: { paddingVertical: 28, alignItems: 'center' },
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