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

const API_URL = "https://monan-backend.onrender.com";

const getDaysLeftInTrial = (createdAtDate) => {
  if (!createdAtDate) return 30;
  const created = new Date(createdAtDate);
  const now = new Date();
  const diffTime = now - created;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const remaining = 30 - diffDays;
  return remaining > 0 ? remaining : 0;
};

const getRemainingSubscriptionDays = (userObj) => {
  if (!userObj) return 0;
  if (userObj.subscriptionExpiresAt) {
    const expires = new Date(userObj.subscriptionExpiresAt);
    const now = new Date();
    const diffTime = expires.getTime() - now.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return getDaysLeftInTrial(userObj.createdAt);
};

const ROLE_LABELS = {
  client: 'Client',
  depot: 'Vendeur',
  livreur: 'Livreur',
};

const SUBSCRIPTION_PLANS = [
  { id: '1m', label: '1 Mois', days: 30, price: 2000, originalPrice: null, badge: 'TARIF DE BASE' },
  { id: '3m', label: '3 Mois', days: 90, price: 4500, originalPrice: 6000, badge: '-25% DE RÉDUCTION' },
  { id: '6m', label: '6 Mois', days: 180, price: 9000, originalPrice: 12000, badge: '-25% DE RÉDUCTION' },
  { id: '1y', label: '1 An', days: 365, price: 18000, originalPrice: 24000, badge: '-25% DE RÉDUCTION' },
];

const PAYMENT_METHODS = ['Wave', 'Orange Money', 'MTN MoMo', 'Moov Money'];
const VEHICLE_TYPES = ['Moto', 'Tricycle'];

const ONBOARDING_SLIDES = [
  {
    id: '1',
    badge: 'BIENVENUE',
    title: 'Monan Service',
    subtitle: 'Plateforme de distribution et livraison de gaz en Côte d’Ivoire.',
    icon: require('./assets/splash-icon.png')
  },
  {
    id: '2',
    badge: 'CLIENT',
    title: 'Commandez en 1 clic',
    subtitle: 'Trouvez les dépôts proches et suivez votre livraison en direct.',
    icon: require('./assets/splash-icon.png')
  },
  {
    id: '3',
    badge: 'VENDEUR',
    title: 'Commandes en direct',
    subtitle: 'Recevez les commandes clients, assignez un livreur et gérez votre dépôt.',
    icon: require('./assets/splash-icon.png')
  },
  {
    id: '4',
    badge: 'LIVREUR',
    title: 'Courses & Livraisons',
    subtitle: 'Récupérez les bouteilles dans les dépôts proches et livrez librement.',
    icon: require('./assets/splash-icon.png')
  }
];

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
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>{children}</Animated.View>;
};

const AnimatedButton = ({ onPress, style, children, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, friction: 8, tension: 50, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
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
  { id: 'districom', name: 'Districom Gaz', color: '#EF4444' },
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

  // Enregistrement d'un livreur indépendant par le vendeur
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
    const timer = setTimeout(() => setIsAppReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const loadStoredUsers = async () => {
    try {
      const stored = await AsyncStorage.getItem('@registered_users_v4');
      if (stored) {
        setRegisteredUsers(JSON.parse(stored));
      }
    } catch (e) {
      console.log('Erreur de chargement des utilisateurs:', e);
    }
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
      setHasSeenOnboarding(true);
    } catch (e) {
      setHasSeenOnboarding(true);
    }
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
    return () => {
      if (backSub && typeof backSub.remove === 'function') {
        backSub.remove();
      } else {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }
    };
  }, [hasSeenOnboarding, onboardingStep, user, currentScreen, dashboardTab]);

  // Mode actif strict :
  // - Vendeur ('depot') : peut uniquement basculer entre 'depot' et 'client'
  // - Livreur ('livreur') : indépendant et détaché ('livreur' uniquement)
  // - Client ('client') : 'client' uniquement
  const activeViewRole = !user
    ? null
    : user.role === 'depot'
    ? (vendorViewMode === 'client' ? 'client' : 'depot')
    : user.role;

  const remainingSubDays = user?.role === 'depot' ? getRemainingSubscriptionDays(user) : null;
  const isVendorSubscriptionExpired = user?.role === 'depot' && remainingSubDays <= 0;

  const activeFormatPrices = vendorPrices[selectedCylinder.id] || { recharge: selectedCylinder.priceRecharge, achat: selectedCylinder.priceAchat };
  const currentUnitPrice = operationType === 'recharge' 
    ? (parseInt(activeFormatPrices.recharge, 10) || selectedCylinder.priceRecharge)
    : (parseInt(activeFormatPrices.achat, 10) || selectedCylinder.priceAchat);

  const handleToggleVendorView = () => {
    if (!user || user.role !== 'depot' || isVendorSubscriptionExpired) return;
    const nextMode = vendorViewMode === 'depot' ? 'client' : 'depot';
    setVendorViewMode(nextMode);
    setDashboardTab('home');
  };

  const persistUserUpdate = async (updatedUserObj) => {
    setUser(updatedUserObj);
    const updatedList = registeredUsers.map(u =>
      u.email === updatedUserObj.email ? { ...u, ...updatedUserObj } : u
    );
    const exists = updatedList.some(u => u.email === updatedUserObj.email);
    const finalList = exists ? updatedList : [...updatedList, updatedUserObj];
    setRegisteredUsers(finalList);
    try {
      await AsyncStorage.setItem('@registered_users_v4', JSON.stringify(finalList));
    } catch (e) {
      console.log('Erreur sauvegarde utilisateur:', e);
    }
  };

  const handleRenewSubscription = async () => {
    const phoneToUse = (paymentPhone || user?.telephone || '').trim();
    if (!phoneToUse || phoneToUse.length < 8) {
      Alert.alert('Numéro requis', 'Veuillez entrer un numéro Mobile Money valide pour le paiement.');
      return;
    }

    setLoading(true);
    const nowMs = Date.now();
    const currentExpiryMs = user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).getTime() : 0;
    const baseTime = Math.max(nowMs, currentExpiryMs);
    const newExpiryIso = new Date(baseTime + selectedPlan.days * 24 * 60 * 60 * 1000).toISOString();

    const updatedUser = {
      ...user,
      isSubscribed: true,
      subscriptionExpiresAt: newExpiryIso,
      lastPlan: selectedPlan.label
    };

    await persistUserUpdate(updatedUser);
    setVendorViewMode('depot');
    setDashboardTab('home');
    setLoading(false);

    Alert.alert(
      'Abonnement activé',
      `Paiement de ${selectedPlan.price.toLocaleString('fr-FR')} FCFA (${selectedPlan.label}) via ${paymentMethod} confirmé. Votre espace vendeur est actif pour ${selectedPlan.days} jours.`
    );
  };

  const handleSimulateExpiration = async () => {
    if (!user || user.role !== 'depot') return;
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expiredUser = {
      ...user,
      isSubscribed: false,
      subscriptionExpiresAt: expiredDate
    };
    await persistUserUpdate(expiredUser);
    setVendorViewMode('depot');
    setDashboardTab('home');
  };

  const handleRegister = async (type) => {
    if (!nom || !telephone || !email || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir les champs obligatoires.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingAccount = registeredUsers.find(u => u.email === cleanEmail);
    if (existingAccount) {
      Alert.alert(
        'Compte existant',
        `Cet email est déjà utilisé pour un compte ${ROLE_LABELS[existingAccount.role]}. Utilisez un autre email ou connectez-vous.`
      );
      return;
    }

    setLoading(true);
    const nowIso = new Date().toISOString();
    const trialExpiryIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newUser = {
      id: `${type === 'depot' ? 'DEP' : type === 'livreur' ? 'LIV' : 'CLI'}-${Math.floor(1000 + Math.random() * 9000)}`,
      nom: nom.trim(),
      email: cleanEmail,
      telephone: telephone.trim(),
      adresse: adresse.trim() || 'Abidjan',
      role: type,
      vehicule: type === 'livreur' ? vehicule : null,
      createdAt: nowIso,
      subscriptionExpiresAt: type === 'depot' ? trialExpiryIso : null,
      isSubscribed: false
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);

    try {
      await AsyncStorage.setItem('@registered_users_v4', JSON.stringify(updatedUsers));
    } catch (e) {
      console.log('Erreur sauvegarde utilisateurs:', e);
    }

    if (type === 'depot') {
      const newDepot = {
        id: newUser.id,
        nom: `Dépôt ${nom.trim()}`,
        distanceKm: 0.1,
        distance: '0.1 km',
        quartier: adresse.trim() || 'Commune Vendeur',
        telephone: telephone.trim()
      };
      setDepotsList(prev => [newDepot, ...prev]);
      setVendorViewMode('depot');
    }

    setUser(newUser);
    setPaymentPhone(telephone.trim());
    if (type === 'client' || type === 'depot') {
      setAdresseLivraison(adresse.trim());
    }
    setDashboardTab('home');
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Veuillez entrer votre email et mot de passe.');
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
    } catch (e) {
      console.log('Erreur lecture utilisateurs:', e);
    }

    const foundUser = storedUsers.find(u => u.email === cleanEmail);

    if (!foundUser) {
      setLoading(false);
      Alert.alert(
        'Compte introuvable',
        'Aucun compte enregistré avec cet email. Veuillez créer un compte depuis l’accueil.'
      );
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
    if (userData.role === 'depot') {
      setVendorViewMode('depot');
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
      Alert.alert('Champs requis', 'Entrez le nom et le téléphone du livreur.');
      return;
    }

    const driverEmail = `${newDriverPhone.trim()}@livreur.monan.ci`;
    const alreadyExists = registeredUsers.some(u => u.email === driverEmail);
    if (alreadyExists) {
      Alert.alert('Numéro déjà utilisé', 'Ce numéro est déjà associé à un compte livreur.');
      return;
    }

    const driverId = `LIV-${Math.floor(1000 + Math.random() * 9000)}`;
    const driverObj = {
      id: driverId,
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
    } catch (e) {
      console.log('Erreur ajout livreur:', e);
    }

    setNewDriverName('');
    setNewDriverPhone('');
    Alert.alert('Livreur enregistré', `${driverObj.nom} a été ajouté comme livreur indépendant.`);
  };

  const handleCreateOrder = () => {
    if (activeViewRole !== 'client') return;
    if (!adresseLivraison) return Alert.alert('Adresse requise', 'Précisez votre lieu de livraison.');

    setLoading(true);

    const qteNum = parseInt(quantite, 10) || 1;
    const totalCalculated = qteNum * currentUnitPrice;
    const newCmdId = `CMD-${Math.floor(100 + Math.random() * 900)}`;

    const newCmd = {
      id: newCmdId,
      date: new Date().toLocaleDateString('fr-FR'),
      clientId: user.id,
      clientNom: user.nom || 'Client',
      clientPhone: user.telephone || 'Non renseigné',
      type: `${selectedMarque.name} ${selectedCylinder.name}`,
      operation: operationType === 'recharge' ? 'Recharge' : 'Achat Neuf',
      qte: qteNum,
      status: 'available',
      assignedVendorId: null,
      assignedVendorNom: null,
      assignedDriverId: null,
      assignedDriverNom: null,
      assignedDriverPhone: null,
      total: `${totalCalculated.toLocaleString('fr-FR')} FCFA`,
      adresse: adresseLivraison,
      depotCible: selectedDepotTarget ? selectedDepotTarget.nom : 'Dépôt proche'
    };

    setAllOrders(prev => [newCmd, ...prev]);
    setOrderSuccessBanner(`Votre commande ${newCmdId} de ${totalCalculated.toLocaleString('fr-FR')} FCFA a été transmise avec succès !`);
    setDashboardTab('orders_list');
    setLoading(false);
  };

  const handleAcceptOrder = (orderId) => {
    if (user?.role !== 'depot' || activeViewRole !== 'depot' || isVendorSubscriptionExpired) return;
    setAllOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: 'accepted',
            assignedVendorId: user.id,
            assignedVendorNom: user.nom || 'Mon Dépôt'
          };
        }
        return order;
      })
    );

    Alert.alert('Commande acceptée', 'La commande est disponible pour les livreurs indépendants ou assignable dans Livraisons.');
  };

  const handleAssignDriverToOrder = (orderId) => {
    if (user?.role !== 'depot' || activeViewRole !== 'depot' || isVendorSubscriptionExpired) return;
    if (independentDrivers.length === 0) {
      Alert.alert('Aucun livreur', 'Aucun livreur indépendant disponible pour le moment.');
      return;
    }

    const chosenDriverId = selectedDriverByOrder[orderId] || independentDrivers[0].id;
    const driver = independentDrivers.find(d => d.id === chosenDriverId) || independentDrivers[0];

    setAllOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: 'in_delivery',
            assignedDriverId: driver.id,
            assignedDriverNom: driver.nom,
            assignedDriverPhone: driver.telephone
          };
        }
        return order;
      })
    );

    Alert.alert('Livreur assigné', `La commande ${orderId} a été confiée à ${driver.nom} (${driver.telephone}).`);
  };

  const handleDriverClaimOrder = (orderId) => {
    if (user?.role !== 'livreur' || activeViewRole !== 'livreur') return;
    setAllOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: 'in_delivery',
            assignedDriverId: user.id,
            assignedDriverNom: user.nom || 'Livreur',
            assignedDriverPhone: user.telephone || ''
          };
        }
        return order;
      })
    );

    Alert.alert('Course acceptée', 'Rendez-vous au dépôt pour récupérer la bouteille.');
    setDashboardTab('driver_active');
  };

  const handleDriverConfirmDelivery = (orderId) => {
    if (user?.role !== 'livreur' || activeViewRole !== 'livreur') return;
    setAllOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId && order.assignedDriverId === user.id) {
          return { ...order, status: 'delivered' };
        }
        return order;
      })
    );
    Alert.alert('Livraison confirmée', 'La commande est clôturée et marquée comme livrée.');
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

  // Tous les livreurs sont indépendants (aucun filtre depotId)
  const independentDrivers = registeredUsers.filter(u => u.role === 'livreur');

  const availableOrdersForVendors = activeViewRole === 'depot'
    ? allOrders.filter(cmd => cmd.status === 'available')
    : [];

  const myVendorDeliveries = activeViewRole === 'depot'
    ? allOrders.filter(cmd => cmd.assignedVendorId === user?.id && (cmd.status === 'accepted' || cmd.status === 'in_delivery'))
    : [];

  // Un livreur indépendant voit toutes les commandes prêtes au retrait quel que soit le dépôt
  const availableOrdersForDrivers = activeViewRole === 'livreur'
    ? allOrders.filter(cmd => cmd.status === 'accepted' && !cmd.assignedDriverId)
    : [];

  const myDriverActiveOrders = activeViewRole === 'livreur'
    ? allOrders.filter(cmd => cmd.assignedDriverId === user?.id && cmd.status === 'in_delivery')
    : [];

  const myDriverDeliveredOrders = activeViewRole === 'livreur'
    ? allOrders.filter(cmd => cmd.assignedDriverId === user?.id && cmd.status === 'delivered')
    : [];

  const myClientOrders = activeViewRole === 'client'
    ? allOrders.filter(cmd => cmd.clientId === user?.id)
    : [];

  const getRoleHeaderLabel = () => {
    if (!user) return 'GAZ EN LIGNE';
    if (user.role === 'depot') {
      return activeViewRole === 'depot' ? 'VENDEUR • VUE DÉPÔT' : 'VENDEUR • VUE CLIENT';
    }
    if (user.role === 'livreur') return 'LIVREUR INDÉPENDANT';
    return 'ESPACE CLIENT';
  };

  const getClientStatusLabel = (cmd) => {
    if (cmd.status === 'delivered') return 'Livrée';
    if (cmd.status === 'in_delivery') {
      return `En livraison • ${cmd.assignedDriverNom} (${cmd.assignedDriverPhone})`;
    }
    if (cmd.status === 'accepted') {
      return `En préparation (${cmd.assignedVendorNom})`;
    }
    return "En attente d'un dépôt";
  };

  if (!isAppReady || hasSeenOnboarding === null) {
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
          <View style={styles.onboardingImageContainer}>
            <PulsingBadge>
              <View style={styles.onboardingBadgeBox}>
                <Image source={currentSlide.icon} style={styles.onboardingLogo} resizeMode="contain" />
              </View>
            </PulsingBadge>
          </View>

          <View style={styles.onboardingTextContainer}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{currentSlide.badge}</Text>
            </View>
            <Text style={styles.onboardingTitle}>{currentSlide.title}</Text>
            <Text style={styles.onboardingSub}>{currentSlide.subtitle}</Text>
          </View>
        </FadeInView>

        <View style={styles.onboardingFooter}>
          <View style={styles.paginationDotsRow}>
            {ONBOARDING_SLIDES.map((_, index) => (
              <View key={index} style={[styles.dot, onboardingStep === index ? styles.dotActive : styles.dotInactive]} />
            ))}
          </View>

          <View style={styles.onboardingBtnRow}>
            {onboardingStep > 0 && (
              <AnimatedButton style={styles.onboardingBackBtn} onPress={() => setOnboardingStep(prev => prev - 1)}>
                <Text style={styles.onboardingBackText}>Retour</Text>
              </AnimatedButton>
            )}

            <AnimatedButton
              style={[styles.btnOrange, { flex: 1, marginLeft: onboardingStep > 0 ? 10 : 0 }]}
              onPress={() => (isLastSlide ? handleFinishOnboarding() : setOnboardingStep(prev => prev + 1))}
            >
              <Text style={styles.btnOrangeText}>{isLastSlide ? 'Commencer' : 'Suivant'}</Text>
            </AnimatedButton>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* BARRE SUPÉRIEURE */}
      <View style={styles.appBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Image source={require('./assets/splash-icon.png')} style={styles.brandLogoImage} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.brandTitle}>MONAN SERVICE</Text>
            <Text style={styles.brandSub}>{getRoleHeaderLabel()}</Text>
          </View>
        </View>

        {user && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {/* BOUTON DE BASCULE EXCLUSIF AU COMPTE VENDEUR (VUE CLIENT <-> VUE VENDEUR) */}
            {user.role === 'depot' && !isVendorSubscriptionExpired && (
              <AnimatedButton style={styles.roleToggleBtn} onPress={handleToggleVendorView}>
                <Text style={styles.roleToggleBtnText}>
                  {activeViewRole === 'depot' ? 'Vue Client' : 'Vue Vendeur'}
                </Text>
              </AnimatedButton>
            )}

            <AnimatedButton style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Quitter</Text>
            </AnimatedButton>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {user ? (
            isVendorSubscriptionExpired ? (
              /* ÉCRAN DE BLOCAGE OBLIGATOIRE QUAND L'ABONNEMENT VENDEUR EST EXPIRÉ */
              <FadeInView key="subscription-lock" style={styles.mainWrapper}>
                <View style={styles.lockCardBox}>
                  <View style={styles.lockBadge}>
                    <Text style={styles.lockBadgeText}>ABONNEMENT EXPIRÉ</Text>
                  </View>

                  <Text style={styles.lockTitle}>Renouvellement obligatoire</Text>
                  <Text style={styles.lockSubtitle}>
                    Bonjour <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{user.nom}</Text>, votre abonnement vendeur est arrivé à terme. Souscrivez à une nouvelle offre pour continuer à recevoir des commandes et gérer votre dépôt.
                  </Text>

                  <View style={styles.promoBannerBox}>
                    <Text style={styles.promoBannerText}>
                      OFFRE SPÉCIALE : 25 % DE RÉDUCTION À PARTIR DE 3 MOIS
                    </Text>
                  </View>

                  <Text style={styles.label}>1. Choisissez votre formule *</Text>
                  <View style={{ gap: 8, marginBottom: 14 }}>
                    {SUBSCRIPTION_PLANS.map((plan) => {
                      const isSelected = selectedPlan.id === plan.id;
                      return (
                        <AnimatedButton
                          key={plan.id}
                          style={[styles.planOptionCard, isSelected && styles.planOptionCardActive]}
                          onPress={() => setSelectedPlan(plan)}
                        >
                          <View>
                            <Text style={[styles.planOptionTitle, isSelected && { color: '#F97316' }]}>
                              {plan.label} ({plan.days} jours)
                            </Text>
                            <Text style={[styles.planOptionSub, !plan.originalPrice && { color: '#94A3B8' }]}>
                              {plan.badge}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            {plan.originalPrice && (
                              <Text style={styles.planOriginalPrice}>
                                {plan.originalPrice.toLocaleString('fr-FR')} F
                              </Text>
                            )}
                            <Text style={styles.planOptionPrice}>
                              {plan.price.toLocaleString('fr-FR')} FCFA
                            </Text>
                          </View>
                        </AnimatedButton>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>2. Moyen de paiement Mobile Money *</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = paymentMethod === method;
                      return (
                        <AnimatedButton
                          key={method}
                          style={[styles.paymentMethodChip, isSelected && styles.paymentMethodChipActive]}
                          onPress={() => setPaymentMethod(method)}
                        >
                          <Text style={[styles.paymentMethodText, isSelected && { color: '#FFFFFF' }]}>
                            {method}
                          </Text>
                        </AnimatedButton>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>3. Numéro {paymentMethod} *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    placeholder="Ex: 0707070707"
                    placeholderTextColor="#64748B"
                    value={paymentPhone}
                    onChangeText={setPaymentPhone}
                  />

                  <AnimatedButton style={styles.btnOrange} onPress={handleRenewSubscription} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.btnOrangeText}>
                        Payer {selectedPlan.price.toLocaleString('fr-FR')} FCFA et continuer
                      </Text>
                    )}
                  </AnimatedButton>
                </View>
              </FadeInView>
            ) : (
            <FadeInView key={`${dashboardTab}-${activeViewRole}`} style={styles.mainWrapper}>
              
              {/* ONGLETS DE NAVIGATION SELON LE MODE ACTIF */}
              <View style={styles.pillsContainerOuter}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScrollContent}>
                  <AnimatedButton
                    style={[styles.pillBtn, dashboardTab === 'home' && styles.pillBtnActive]}
                    onPress={() => setDashboardTab('home')}
                  >
                    <Text style={[styles.pillText, dashboardTab === 'home' && styles.pillTextActive]}>Accueil</Text>
                  </AnimatedButton>

                  {activeViewRole === 'depot' && (
                    <>
                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'vendor_live_orders' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('vendor_live_orders')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'vendor_live_orders' && styles.pillTextActive]}>
                          Commandes ({availableOrdersForVendors.length})
                        </Text>
                      </AnimatedButton>

                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'my_deliveries' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('my_deliveries')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'my_deliveries' && styles.pillTextActive]}>
                          Livraisons ({myVendorDeliveries.length})
                        </Text>
                      </AnimatedButton>

                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'vendor_drivers' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('vendor_drivers')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'vendor_drivers' && styles.pillTextActive]}>
                          Livreurs ({independentDrivers.length})
                        </Text>
                      </AnimatedButton>

                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'pricing' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('pricing')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'pricing' && styles.pillTextActive]}>Mes Prix</Text>
                      </AnimatedButton>
                    </>
                  )}

                  {activeViewRole === 'livreur' && (
                    <>
                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'driver_available' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('driver_available')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'driver_available' && styles.pillTextActive]}>
                          Courses dispo ({availableOrdersForDrivers.length})
                        </Text>
                      </AnimatedButton>

                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'driver_active' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('driver_active')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'driver_active' && styles.pillTextActive]}>
                          Mes courses ({myDriverActiveOrders.length})
                        </Text>
                      </AnimatedButton>

                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'driver_history' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('driver_history')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'driver_history' && styles.pillTextActive]}>
                          Livrées ({myDriverDeliveredOrders.length})
                        </Text>
                      </AnimatedButton>
                    </>
                  )}

                  {activeViewRole === 'client' && (
                    <>
                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'depots' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('depots')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'depots' && styles.pillTextActive]}>Dépôts proches</Text>
                      </AnimatedButton>
                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'catalog' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('catalog')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'catalog' && styles.pillTextActive]}>Catalogue</Text>
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
                          Suivis ({myClientOrders.length})
                        </Text>
                      </AnimatedButton>
                    </>
                  )}
                </ScrollView>
              </View>

              {/* ACCUEIL */}
              {dashboardTab === 'home' && (
                <View style={styles.fullSection}>
                  <View style={styles.userGreetingCard}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{(user.nom || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.greetingTitle}>Bonjour, {user.nom || 'Utilisateur'}</Text>
                      <Text style={styles.greetingSubtitle}>
                        {user.role === 'depot'
                          ? (activeViewRole === 'depot' ? 'Compte Vendeur • Mode Dépôt' : 'Compte Vendeur • Mode Client')
                          : user.role === 'livreur'
                          ? `Livreur Indépendant • ${user.vehicule || 'Moto'}`
                          : 'Compte Client'}
                      </Text>
                    </View>
                  </View>

                  {/* STATUT ABONNEMENT VENDEUR */}
                  {user.role === 'depot' && (
                    <View style={styles.subStatusCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subStatusLabel}>ABONNEMENT VENDEUR</Text>
                        <Text style={styles.subStatusDays}>
                          {remainingSubDays} jour{remainingSubDays > 1 ? 's' : ''} restant{remainingSubDays > 1 ? 's' : ''}
                        </Text>
                      </View>
                      <AnimatedButton style={styles.simExpireBtn} onPress={handleSimulateExpiration}>
                        <Text style={styles.simExpireBtnText}>Simuler expiration</Text>
                      </AnimatedButton>
                    </View>
                  )}

                  <View style={styles.kpiGrid}>
                    {activeViewRole === 'depot' && (
                      <>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>COMMANDES DISPO</Text>
                          <Text style={styles.kpiCardNum}>{availableOrdersForVendors.length}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>LIVRAISONS</Text>
                          <Text style={styles.kpiCardNum}>{myVendorDeliveries.length}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>LIVREURS</Text>
                          <Text style={styles.kpiCardNum}>{independentDrivers.length}</Text>
                        </View>
                      </>
                    )}

                    {activeViewRole === 'livreur' && (
                      <>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>COURSES DISPO</Text>
                          <Text style={styles.kpiCardNum}>{availableOrdersForDrivers.length}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>EN COURS</Text>
                          <Text style={styles.kpiCardNum}>{myDriverActiveOrders.length}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>LIVRÉES</Text>
                          <Text style={styles.kpiCardNum}>{myDriverDeliveredOrders.length}</Text>
                        </View>
                      </>
                    )}

                    {activeViewRole === 'client' && (
                      <>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>DÉPÔTS PROCHES</Text>
                          <Text style={styles.kpiCardNum}>{sortedAndFilteredDepots.length}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>MES COMMANDES</Text>
                          <Text style={styles.kpiCardNum}>{myClientOrders.length}</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {activeViewRole === 'depot' && (
                    <View style={{ gap: 10 }}>
                      <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('vendor_live_orders')}>
                        <Text style={styles.actionCardTitle}>Commandes en direct</Text>
                      </AnimatedButton>

                      <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('my_deliveries')}>
                        <Text style={styles.actionCardTitleWhite}>Assigner un livreur</Text>
                      </AnimatedButton>

                      <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('pricing')}>
                        <Text style={styles.actionCardTitleWhite}>Gérer mes prix</Text>
                      </AnimatedButton>
                    </View>
                  )}

                  {activeViewRole === 'livreur' && (
                    <View style={{ gap: 10 }}>
                      <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('driver_available')}>
                        <Text style={styles.actionCardTitle}>Courses disponibles</Text>
                      </AnimatedButton>

                      <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('driver_active')}>
                        <Text style={styles.actionCardTitleWhite}>Mes courses en cours</Text>
                      </AnimatedButton>
                    </View>
                  )}

                  {activeViewRole === 'client' && (
                    <View style={{ gap: 10 }}>
                      <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('depots')}>
                        <Text style={styles.actionCardTitle}>Dépôts proches</Text>
                      </AnimatedButton>

                      <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('order')}>
                        <Text style={styles.actionCardTitleWhite}>Nouvelle commande</Text>
                      </AnimatedButton>
                    </View>
                  )}
                </View>
              )}

              {/* === VUES VENDEUR (MODE DÉPÔT) === */}
              {activeViewRole === 'depot' && dashboardTab === 'vendor_live_orders' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Commandes disponibles</Text>

                  {availableOrdersForVendors.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>Aucune commande en attente.</Text>
                    </View>
                  ) : (
                    availableOrdersForVendors.map((order) => (
                      <View key={order.id} style={styles.liveOrderCard}>
                        <View style={styles.liveOrderHeader}>
                          <Text style={styles.liveOrderId}>{order.id} • {order.date}</Text>
                          <Text style={styles.liveOrderBadge}>EN ATTENTE</Text>
                        </View>
                        <Text style={styles.liveOrderClient}>{order.clientNom} ({order.clientPhone})</Text>
                        <Text style={styles.liveOrderArticle}>{order.qte}x {order.type} ({order.operation})</Text>
                        <Text style={styles.liveOrderAddress}>Lieu : {order.adresse}</Text>
                        <Text style={styles.liveOrderTotal}>Total : {order.total}</Text>

                        <AnimatedButton style={styles.btnAcceptOrder} onPress={() => handleAcceptOrder(order.id)}>
                          <Text style={styles.btnAcceptOrderText}>Accepter</Text>
                        </AnimatedButton>
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeViewRole === 'depot' && dashboardTab === 'my_deliveries' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Livraisons & Livreurs</Text>
                  {myVendorDeliveries.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>Aucune livraison en cours.</Text>
                  ) : (
                    myVendorDeliveries.map((order) => {
                      const activeSelectedDriverId = selectedDriverByOrder[order.id] || independentDrivers[0]?.id;

                      return (
                        <View key={order.id} style={[styles.liveOrderCard, { borderColor: order.status === 'in_delivery' ? '#38BDF8' : '#4ADE80' }]}>
                          <View style={styles.liveOrderHeader}>
                            <Text style={styles.liveOrderId}>{order.id}</Text>
                            <Text style={[
                              styles.liveOrderBadge,
                              order.status === 'in_delivery'
                                ? { backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }
                                : { backgroundColor: 'rgba(74, 222, 128, 0.2)', color: '#4ADE80' }
                            ]}>
                              {order.status === 'in_delivery' ? 'EN COURS DE LIVRAISON' : 'EN ATTENTE DE LIVREUR'}
                            </Text>
                          </View>
                          <Text style={styles.liveOrderClient}>Client : {order.clientNom} ({order.clientPhone})</Text>
                          <Text style={styles.liveOrderArticle}>{order.qte}x {order.type}</Text>
                          <Text style={styles.liveOrderAddress}>Adresse : {order.adresse}</Text>
                          <Text style={styles.liveOrderTotal}>Total : {order.total}</Text>

                          {order.status === 'accepted' ? (
                            <View style={styles.assignDriverBox}>
                              <Text style={styles.assignDriverLabel}>Choisir un livreur indépendant :</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                  {independentDrivers.map((drv) => {
                                    const isChosen = activeSelectedDriverId === drv.id;
                                    return (
                                      <AnimatedButton
                                        key={drv.id}
                                        style={[styles.driverChip, isChosen && styles.driverChipActive]}
                                        onPress={() => setSelectedDriverByOrder(prev => ({ ...prev, [order.id]: drv.id }))}
                                      >
                                        <Text style={[styles.driverChipText, isChosen && { color: '#FFFFFF' }]}>
                                          {drv.nom} ({drv.vehicule || 'Moto'})
                                        </Text>
                                      </AnimatedButton>
                                    );
                                  })}
                                </View>
                              </ScrollView>

                              <AnimatedButton style={styles.btnAcceptOrder} onPress={() => handleAssignDriverToOrder(order.id)}>
                                <Text style={styles.btnAcceptOrderText}>Assigner le livreur</Text>
                              </AnimatedButton>
                            </View>
                          ) : (
                            <View style={styles.assignedDriverBanner}>
                              <Text style={styles.assignedDriverText}>
                                Confiée à : <Text style={{ fontWeight: '900', color: '#38BDF8' }}>{order.assignedDriverNom}</Text> ({order.assignedDriverPhone})
                              </Text>
                              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
                                En attente de confirmation par le livreur chez le client.
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {activeViewRole === 'depot' && dashboardTab === 'vendor_drivers' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Livreurs indépendants ({independentDrivers.length})</Text>

                  <View style={styles.addDriverForm}>
                    <Text style={styles.label}>Enregistrer un livreur indépendant</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nom du livreur (Ex: Yao Paul)"
                      placeholderTextColor="#64748B"
                      value={newDriverName}
                      onChangeText={setNewDriverName}
                    />
                    <TextInput
                      style={styles.input}
                      keyboardType="phone-pad"
                      placeholder="Téléphone (Ex: 0701020304)"
                      placeholderTextColor="#64748B"
                      value={newDriverPhone}
                      onChangeText={setNewDriverPhone}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                      {VEHICLE_TYPES.map((v) => (
                        <AnimatedButton
                          key={v}
                          style={[styles.opTypeBtn, newDriverVehicle === v && styles.opTypeBtnActive]}
                          onPress={() => setNewDriverVehicle(v)}
                        >
                          <Text style={[styles.opTypeText, newDriverVehicle === v && styles.opTypeTextActive]}>{v}</Text>
                        </AnimatedButton>
                      ))}
                    </View>
                    <AnimatedButton style={styles.btnOrange} onPress={handleAddDriverFromVendor}>
                      <Text style={styles.btnOrangeText}>Ajouter le livreur</Text>
                    </AnimatedButton>
                  </View>

                  {independentDrivers.map((drv) => {
                    const activeDeliveriesCount = allOrders.filter(
                      o => o.assignedDriverId === drv.id && o.status === 'in_delivery'
                    ).length;

                    return (
                      <View key={drv.id} style={styles.driverRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.depotTitle}>{drv.nom}</Text>
                          <Text style={styles.depotSub}>{drv.telephone} • {drv.vehicule || 'Moto'} • Indépendant</Text>
                        </View>
                        <View style={[
                          styles.driverStatusPill,
                          activeDeliveriesCount > 0 ? { backgroundColor: 'rgba(249, 115, 22, 0.2)' } : { backgroundColor: 'rgba(34, 197, 94, 0.2)' }
                        ]}>
                          <Text style={[
                            styles.driverStatusText,
                            activeDeliveriesCount > 0 ? { color: '#F97316' } : { color: '#4ADE80' }
                          ]}>
                            {activeDeliveriesCount > 0 ? `En course (${activeDeliveriesCount})` : 'Disponible'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {activeViewRole === 'depot' && dashboardTab === 'pricing' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Mes prix</Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 11, marginBottom: 8 }}>Format B6 (6 kg)</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Recharge (F)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B6.recharge} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B6: { ...vendorPrices.B6, recharge: val } })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Achat (F)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B6.achat} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B6: { ...vendorPrices.B6, achat: val } })} />
                    </View>
                  </View>

                  <Text style={{ color: '#CBD5E1', fontSize: 11, marginBottom: 8 }}>Format B12 (12.5 kg)</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Recharge (F)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B12.recharge} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B12: { ...vendorPrices.B12, recharge: val } })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Achat (F)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B12.achat} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B12: { ...vendorPrices.B12, achat: val } })} />
                    </View>
                  </View>

                  <Text style={{ color: '#CBD5E1', fontSize: 11, marginBottom: 8 }}>Format B28 (28 kg)</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Recharge (F)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B28.recharge} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B28: { ...vendorPrices.B28, recharge: val } })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Achat (F)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={vendorPrices.B28.achat} onChangeText={(val) => setVendorPrices({ ...vendorPrices, B28: { ...vendorPrices.B28, achat: val } })} />
                    </View>
                  </View>

                  <AnimatedButton style={styles.btnOrange} onPress={() => Alert.alert('Succès', 'Tarifs mis à jour.')}>
                    <Text style={styles.btnOrangeText}>Enregistrer</Text>
                  </AnimatedButton>
                </View>
              )}

              {/* === VUES EXCLUSIVES LIVREUR INDÉPENDANT === */}
              {activeViewRole === 'livreur' && dashboardTab === 'driver_available' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Courses disponibles (Tous dépôts)</Text>

                  {availableOrdersForDrivers.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>Aucune course prête au dépôt pour le moment.</Text>
                    </View>
                  ) : (
                    availableOrdersForDrivers.map((order) => (
                      <View key={order.id} style={styles.liveOrderCard}>
                        <View style={styles.liveOrderHeader}>
                          <Text style={styles.liveOrderId}>{order.id} • {order.date}</Text>
                          <Text style={styles.liveOrderBadge}>À RÉCUPÉRER</Text>
                        </View>
                        <Text style={styles.liveOrderClient}>Dépôt : {order.assignedVendorNom}</Text>
                        <Text style={styles.liveOrderArticle}>{order.qte}x {order.type} ({order.operation})</Text>
                        <Text style={styles.liveOrderAddress}>Livrer à : {order.clientNom} • {order.adresse}</Text>
                        <Text style={styles.liveOrderTotal}>Montant : {order.total}</Text>

                        <AnimatedButton style={styles.btnAcceptOrder} onPress={() => handleDriverClaimOrder(order.id)}>
                          <Text style={styles.btnAcceptOrderText}>Prendre la course</Text>
                        </AnimatedButton>
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeViewRole === 'livreur' && dashboardTab === 'driver_active' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Mes courses en cours</Text>

                  {myDriverActiveOrders.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>Vous n'avez aucune livraison en cours.</Text>
                    </View>
                  ) : (
                    myDriverActiveOrders.map((order) => (
                      <View key={order.id} style={[styles.liveOrderCard, { borderColor: '#38BDF8' }]}>
                        <View style={styles.liveOrderHeader}>
                          <Text style={styles.liveOrderId}>{order.id}</Text>
                          <Text style={[styles.liveOrderBadge, { backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }]}>
                            EN ROUTE
                          </Text>
                        </View>
                        <Text style={styles.liveOrderClient}>Client : {order.clientNom} ({order.clientPhone})</Text>
                        <Text style={styles.liveOrderArticle}>{order.qte}x {order.type} ({order.operation})</Text>
                        <Text style={styles.liveOrderAddress}>Destination : {order.adresse}</Text>
                        <Text style={styles.liveOrderAddress}>Dépôt : {order.assignedVendorNom}</Text>
                        <Text style={styles.liveOrderTotal}>À encaisser : {order.total}</Text>

                        <AnimatedButton style={[styles.btnAcceptOrder, { marginTop: 10 }]} onPress={() => handleDriverConfirmDelivery(order.id)}>
                          <Text style={styles.btnAcceptOrderText}>Confirmer la livraison</Text>
                        </AnimatedButton>
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeViewRole === 'livreur' && dashboardTab === 'driver_history' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Courses livrées</Text>

                  {myDriverDeliveredOrders.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>Aucune livraison terminée.</Text>
                  ) : (
                    myDriverDeliveredOrders.map((cmd) => (
                      <View key={cmd.id} style={styles.orderRow}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={styles.orderRowId}>{cmd.id} • {cmd.date}</Text>
                          <Text style={[styles.orderRowStatus, { color: '#4ADE80' }]}>Livrée</Text>
                        </View>
                        <Text style={styles.orderRowBody}>{cmd.qte}x {cmd.type} • Client : {cmd.clientNom}</Text>
                        <Text style={styles.orderRowTotal}>{cmd.total}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* === VUES CLIENT (COMPTE CLIENT OU VUE CLIENT DU VENDEUR) === */}
              {activeViewRole === 'client' && dashboardTab === 'depots' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Dépôts proches</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Filtrer par quartier..."
                    placeholderTextColor="#64748B"
                    value={searchDepot}
                    onChangeText={setSearchDepot}
                  />

                  {sortedAndFilteredDepots.map((depot, index) => (
                    <View key={depot.id} style={styles.depotCardSorted}>
                      <View style={styles.depotHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                          </View>
                          <View>
                            <Text style={styles.depotTitle}>{depot.nom}</Text>
                            <Text style={styles.depotSub}>{depot.quartier}</Text>
                          </View>
                        </View>
                        <Text style={styles.depotDistanceHighlight}>{depot.distance}</Text>
                      </View>

                      <AnimatedButton
                        style={styles.btnDepotSelect}
                        onPress={() => {
                          setSelectedDepotTarget(depot);
                          setAdresseLivraison(depot.quartier);
                          setDashboardTab('order');
                        }}
                      >
                        <Text style={styles.btnDepotSelectText}>Commander ici</Text>
                      </AnimatedButton>
                    </View>
                  ))}
                </View>
              )}

              {activeViewRole === 'client' && (dashboardTab === 'catalog' || dashboardTab === 'order') && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>
                    {dashboardTab === 'catalog' ? 'Catalogue' : 'Nouvelle commande'}
                  </Text>

                  {selectedDepotTarget && (
                    <View style={styles.selectedDepotBanner}>
                      <Text style={styles.selectedDepotText}>
                        Dépôt : <Text style={{ fontWeight: '900', color: '#F97316' }}>{selectedDepotTarget.nom}</Text> ({selectedDepotTarget.distance})
                      </Text>
                    </View>
                  )}

                  <Text style={styles.label}>Opération *</Text>
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

                  <Text style={styles.label}>Format *</Text>
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
                          <Text style={{ fontSize: 9, color: isSelected ? '#F97316' : '#94A3B8', marginTop: 2 }}>
                            {activePrice.toLocaleString('fr-FR')} F
                          </Text>
                        </AnimatedButton>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Marque *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {MARQUES_GAZ.map((m) => {
                        const isSelected = selectedMarque.id === m.id;
                        return (
                          <AnimatedButton
                            key={m.id}
                            style={[styles.brandChip, isSelected && { backgroundColor: m.color, borderColor: m.color }]}
                            onPress={() => {
                              setSelectedMarque(m);
                              if (dashboardTab === 'catalog') setDashboardTab('order');
                            }}
                          >
                            <Text style={[styles.brandChipText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                              {m.name}
                            </Text>
                          </AnimatedButton>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {dashboardTab === 'order' && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.label}>Quantité</Text>
                      <QuantityStepper value={quantite} onChange={setQuantite} />

                      <Text style={styles.label}>Adresse *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Commune, quartier..."
                        placeholderTextColor="#64748B"
                        value={adresseLivraison}
                        onChangeText={setAdresseLivraison}
                      />

                      <View style={styles.totalSummary}>
                        <Text style={styles.totalSummaryLabel}>Total :</Text>
                        <Text style={styles.totalSummaryValue}>
                          {((parseInt(quantite, 10) || 1) * currentUnitPrice).toLocaleString('fr-FR')} FCFA
                        </Text>
                      </View>

                      <AnimatedButton style={styles.btnOrange} onPress={handleCreateOrder} disabled={loading}>
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.btnOrangeText}>Valider la commande</Text>
                        )}
                      </AnimatedButton>
                    </View>
                  )}
                </View>
              )}

              {activeViewRole === 'client' && dashboardTab === 'orders_list' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Mes suivis</Text>

                  {orderSuccessBanner !== '' && (
                    <View style={styles.successBannerBox}>
                      <Text style={styles.successBannerText}>{orderSuccessBanner}</Text>
                    </View>
                  )}

                  {myClientOrders.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>Aucune commande.</Text>
                  ) : (
                    myClientOrders.map((cmd) => (
                      <View key={cmd.id} style={styles.orderRow}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                          <Text style={styles.orderRowId}>{cmd.id} • {cmd.date}</Text>
                          <Text style={[
                            styles.orderRowStatus,
                            cmd.status === 'delivered'
                              ? { color: '#4ADE80' }
                              : cmd.status === 'in_delivery'
                              ? { color: '#38BDF8' }
                              : cmd.status === 'accepted'
                              ? { color: '#FBBF24' }
                              : { color: '#F97316' }
                          ]}>
                            {getClientStatusLabel(cmd)}
                          </Text>
                        </View>
                        <Text style={styles.orderRowBody}>{cmd.qte}x {cmd.type} ({cmd.operation})</Text>
                        <Text style={styles.orderRowTotal}>{cmd.total}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}

            </FadeInView>
            )
          ) : (
            /* AUTHENTIFICATION */
            <FadeInView key={currentScreen} style={styles.mainWrapper}>
              {currentScreen === 'welcome' && (
                <View style={styles.welcomeContainer}>
                  <FadeInView delay={40}>
                    <View style={styles.heroSection}>
                      <PulsingBadge>
                        <View style={styles.heroBadge}>
                          <Text style={styles.heroBadgeText}>RAPIDE & SÉCURISÉ</Text>
                        </View>
                      </PulsingBadge>
                      <Text style={styles.heroTitle}>Livraison & Gestion de Gaz</Text>
                    </View>
                  </FadeInView>

                  <View style={styles.cardsWrapper}>
                    <FadeInView delay={100}>
                      <AnimatedButton style={styles.welcomeCardDark} onPress={() => setCurrentScreen('register_client')}>
                        <Text style={styles.welcomeCardTitleLight}>Espace Client</Text>
                        <Text style={styles.welcomeCardSubLight}>Commandes de gaz</Text>
                      </AnimatedButton>
                    </FadeInView>

                    <FadeInView delay={160}>
                      <AnimatedButton style={styles.welcomeCardWhite} onPress={() => setCurrentScreen('register_depot')}>
                        <Text style={styles.welcomeCardTitleDark}>Espace Vendeur</Text>
                        <Text style={styles.welcomeCardSubDark}>Gérer mon dépôt et commander</Text>
                      </AnimatedButton>
                    </FadeInView>

                    <FadeInView delay={220}>
                      <AnimatedButton style={styles.welcomeCardWhite} onPress={() => setCurrentScreen('register_livreur')}>
                        <Text style={styles.welcomeCardTitleDark}>Espace Livreur</Text>
                        <Text style={styles.welcomeCardSubDark}>Livraisons indépendantes</Text>
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

              {(currentScreen === 'register_client' || currentScreen === 'register_depot' || currentScreen === 'register_livreur') && (
                <View style={styles.cardBox}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={styles.backBtnInline}>
                    <Text style={styles.backBtnInlineText}>Retour</Text>
                  </AnimatedButton>
                  
                  <Text style={styles.cardBoxTitle}>
                    {currentScreen === 'register_depot'
                      ? 'Inscription Vendeur'
                      : currentScreen === 'register_livreur'
                      ? 'Inscription Livreur Indépendant'
                      : 'Inscription Client'}
                  </Text>

                  <Text style={styles.label}>
                    {currentScreen === 'register_depot' ? 'Nom du Dépôt / Responsable *' : 'Nom complet *'}
                  </Text>
                  <TextInput style={styles.input} placeholder="Ex: Koné Moussa" placeholderTextColor="#64748B" value={nom} onChangeText={setNom} />

                  <Text style={styles.label}>Téléphone *</Text>
                  <TextInput style={styles.input} keyboardType="phone-pad" placeholder="0700000000" placeholderTextColor="#64748B" value={telephone} onChangeText={setTelephone} />

                  <Text style={styles.label}>
                    {currentScreen === 'register_livreur' ? 'Zone d’activité *' : 'Adresse *'}
                  </Text>
                  <TextInput style={styles.input} placeholder="Quartier, commune..." placeholderTextColor="#64748B" value={adresse} onChangeText={setAdresse} />

                  {currentScreen === 'register_livreur' && (
                    <>
                      <Text style={styles.label}>Véhicule *</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        {VEHICLE_TYPES.map((v) => (
                          <AnimatedButton
                            key={v}
                            style={[styles.opTypeBtn, vehicule === v && styles.opTypeBtnActive]}
                            onPress={() => setVehicule(v)}
                          >
                            <Text style={[styles.opTypeText, vehicule === v && styles.opTypeTextActive]}>{v}</Text>
                          </AnimatedButton>
                        ))}
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>Email *</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@exemple.com" placeholderTextColor="#64748B" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe *</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#64748B" value={password} onChangeText={setPassword} />

                  <AnimatedButton
                    style={styles.btnOrange}
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
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>S'inscrire</Text>}
                  </AnimatedButton>
                </View>
              )}

              {/* ÉCRAN DE CONNEXION UNIFIÉ */}
              {currentScreen === 'login' && (
                <View style={styles.cardBox}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={styles.backBtnInline}>
                    <Text style={styles.backBtnInlineText}>Retour</Text>
                  </AnimatedButton>
                  
                  <Text style={styles.cardBoxTitle}>Connexion</Text>

                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="exemple@monan.ci"
                    placeholderTextColor="#64748B"
                    value={email}
                    onChangeText={setEmail}
                  />

                  <Text style={styles.label}>Mot de passe *</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor="#64748B"
                    value={password}
                    onChangeText={setPassword}
                  />

                  <AnimatedButton style={styles.btnOrange} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Se connecter</Text>}
                  </AnimatedButton>
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
  container: { flex: 1, backgroundColor: '#1A365D' },
  splashContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 90, height: 90, marginBottom: 14 },
  splashTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  splashSubTitle: { color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  
  onboardingContainer: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 20, justifyContent: 'space-between' },
  onboardingHeader: { alignItems: 'flex-end', paddingTop: 16 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1E293B' },
  skipBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  onboardingSlideWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  onboardingImageContainer: { marginBottom: 30, alignItems: 'center' },
  onboardingBadgeBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F97316' },
  onboardingLogo: { width: 60, height: 60 },
  onboardingTextContainer: { alignItems: 'center', paddingHorizontal: 10 },
  onboardingTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  onboardingSub: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  onboardingFooter: { paddingBottom: 24 },
  paginationDotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 20 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: '#F97316' },
  dotInactive: { width: 8, backgroundColor: '#334155' },
  onboardingBtnRow: { flexDirection: 'row', alignItems: 'center' },
  onboardingBackBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  onboardingBackText: { color: '#CBD5E1', fontWeight: '800', fontSize: 13 },

  appBar: { backgroundColor: '#0F172A', paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#F97316' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandBadge: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  brandLogoImage: { width: 22, height: 22 },
  brandTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  brandSub: { color: '#94A3B8', fontSize: 9, fontWeight: '700' },
  
  roleToggleBtn: { backgroundColor: '#F97316', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  roleToggleBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  logoutBtnText: { color: '#F87171', fontSize: 11, fontWeight: '700' },
  
  scrollContent: { flexGrow: 1, padding: 16 },
  mainWrapper: { flex: 1, justifyContent: 'space-between' },

  lockCardBox: { backgroundColor: '#0F172A', borderRadius: 16, padding: 18, borderWidth: 1.5, borderColor: '#EF4444' },
  lockBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 10 },
  lockBadgeText: { color: '#F87171', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  lockTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 6 },
  lockSubtitle: { color: '#94A3B8', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  promoBannerBox: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1, borderColor: '#22C55E', borderRadius: 8, padding: 10, marginBottom: 14 },
  promoBannerText: { color: '#4ADE80', fontSize: 11, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  planOptionCard: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planOptionCardActive: { borderColor: '#F97316', backgroundColor: '#273549' },
  planOptionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  planOptionSub: { color: '#4ADE80', fontSize: 10, fontWeight: '800', marginTop: 2 },
  planOriginalPrice: { color: '#94A3B8', fontSize: 11, textDecorationLine: 'line-through', fontWeight: '700' },
  planOptionPrice: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  paymentMethodChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  paymentMethodChipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  paymentMethodText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },

  subStatusCard: { backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subStatusLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '800' },
  subStatusDays: { color: '#4ADE80', fontSize: 14, fontWeight: '900', marginTop: 2 },
  simExpireBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  simExpireBtnText: { color: '#F87171', fontSize: 10, fontWeight: '800' },
  
  pillsContainerOuter: { backgroundColor: '#0F172A', borderRadius: 12, padding: 3, marginBottom: 14 },
  pillsScrollContent: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  pillBtnActive: { backgroundColor: '#F97316' },
  pillText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '800' },
  
  userGreetingCard: { backgroundColor: '#0F172A', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, borderWidth: 1, borderColor: '#1E293B' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  greetingTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  greetingSubtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard: { flex: 1, backgroundColor: '#0F172A', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  kpiCardTag: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  kpiCardNum: { fontSize: 17, fontWeight: '900', color: '#F97316', marginTop: 2 },
  
  actionCardOrange: { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#F97316', borderRadius: 12, padding: 14, alignItems: 'center' },
  actionCardTitle: { fontSize: 14, fontWeight: '800', color: '#C2410C' },
  actionCardNavy: { backgroundColor: '#0F172A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center' },
  actionCardTitleWhite: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  
  cardBox: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  cardBoxTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 12 },
  backBtnInline: { marginBottom: 10 },
  backBtnInlineText: { color: '#F97316', fontWeight: '800', fontSize: 12 },

  successBannerBox: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1.5, borderColor: '#22C55E', padding: 12, borderRadius: 10, marginBottom: 14 },
  successBannerText: { color: '#4ADE80', fontWeight: '800', fontSize: 12, textAlign: 'center' },

  depotCardSorted: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 12, marginBottom: 10 },
  depotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' },
  rankBadgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
  depotTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  depotSub: { fontSize: 11, color: '#94A3B8' },
  depotDistanceHighlight: { color: '#4ADE80', fontWeight: '900', fontSize: 13 },
  btnDepotSelect: { backgroundColor: '#F97316', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnDepotSelectText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  selectedDepotBanner: { backgroundColor: '#1E293B', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#F97316' },
  selectedDepotText: { color: '#FFFFFF', fontSize: 12 },

  liveOrderCard: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#F97316', borderRadius: 12, padding: 12, marginBottom: 10 },
  liveOrderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  liveOrderId: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  liveOrderBadge: { backgroundColor: 'rgba(249, 115, 22, 0.2)', color: '#F97316', fontWeight: '800', fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveOrderClient: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  liveOrderArticle: { color: '#CBD5E1', fontSize: 12, marginVertical: 2 },
  liveOrderAddress: { color: '#94A3B8', fontSize: 11 },
  liveOrderTotal: { color: '#F97316', fontWeight: '900', fontSize: 14, marginTop: 4 },
  btnAcceptOrder: { backgroundColor: '#22C55E', paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnAcceptOrderText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },

  assignDriverBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  assignDriverLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  driverChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  driverChipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  driverChipText: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
  assignedDriverBanner: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#38BDF8' },
  assignedDriverText: { color: '#FFFFFF', fontSize: 12 },

  addDriverForm: { backgroundColor: '#1E293B', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  driverRowCard: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverStatusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  driverStatusText: { fontSize: 10, fontWeight: '800' },

  emptyStateBox: { backgroundColor: '#1E293B', padding: 20, borderRadius: 12, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155' },
  emptyStateText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textAlign: 'center' },

  opTypeBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, backgroundColor: '#1E293B', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  opTypeBtnActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  opTypeText: { fontSize: 11, fontWeight: '700', color: '#CBD5E1' },
  opTypeTextActive: { color: '#FFFFFF' },

  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155', borderRadius: 10, padding: 3, width: 130, justifyContent: 'space-between', marginBottom: 14 },
  stepperBtn: { width: 32, height: 32, backgroundColor: '#F97316', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  stepperBtnDisabled: { backgroundColor: '#334155' },
  stepperBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  stepperValueBox: { flex: 1, alignItems: 'center' },
  stepperValueText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  
  label: { fontSize: 12, fontWeight: '700', color: '#CBD5E1', marginBottom: 4 },
  input: { backgroundColor: '#1E293B', borderWidth: 1.5, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#FFFFFF', marginBottom: 12 },
  totalSummary: { backgroundColor: '#1E293B', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  totalSummaryLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  totalSummaryValue: { color: '#F97316', fontSize: 16, fontWeight: '900' },
  btnOrange: { backgroundColor: '#F97316', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnOrangeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  
  smallCylBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#1E293B', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  smallCylBtnActive: { backgroundColor: '#334155', borderColor: '#F97316' },
  smallCylText: { fontSize: 11, fontWeight: '700', color: '#CBD5E1' },
  smallCylTextActive: { color: '#F97316', fontWeight: '800' },

  brandChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  brandChipText: { fontSize: 11, fontWeight: '700', color: '#CBD5E1' },

  orderRow: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 10, marginBottom: 8 },
  orderRowId: { fontWeight: '800', color: '#FFFFFF', fontSize: 12 },
  orderRowStatus: { fontWeight: '800', fontSize: 11 },
  orderRowBody: { fontSize: 12, color: '#CBD5E1', marginVertical: 2 },
  orderRowTotal: { color: '#F97316', fontWeight: '800', fontSize: 12 },
  
  welcomeContainer: { flex: 1, justifyContent: 'space-between' },
  heroSection: { marginVertical: 10 },
  heroBadge: { backgroundColor: '#FFF7ED', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  heroBadgeText: { color: '#C2410C', fontSize: 10, fontWeight: '800' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', lineHeight: 30 },
  cardsWrapper: { gap: 10, marginVertical: 10 },
  welcomeCardDark: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  welcomeCardWhite: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155' },
  welcomeCardTitleLight: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  welcomeCardSubLight: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  welcomeCardTitleDark: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  welcomeCardSubDark: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  btnNavyOutline: { borderWidth: 1.5, borderColor: '#F97316', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  btnNavyOutlineText: { color: '#F97316', fontWeight: '800', fontSize: 13 }
});