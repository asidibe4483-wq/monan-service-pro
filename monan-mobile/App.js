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
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const remaining = 30 - diffDays;
  return remaining > 0 ? remaining : 0;
};

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
    subtitle: 'Recevez les commandes clients, acceptez-les et gérez votre dépôt.',
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
  { id: 'DEP-01', nom: 'Dépôt Angré 8e Tranche', distanceKm: 0.3, distance: '0.3 km', quartier: 'Cocody Angré', telephone: '0707010203' },
  { id: 'DEP-02', nom: 'Dépôt Saint-Jean', distanceKm: 1.2, distance: '1.2 km', quartier: 'Cocody Centre', telephone: '0708020304' },
  { id: 'DEP-03', nom: 'Dépôt Riviera 2', distanceKm: 2.5, distance: '2.5 km', quartier: 'Cocody Riviera', telephone: '0709030405' },
  { id: 'DEP-04', nom: 'Dépôt Yopougon Maroc', distanceKm: 5.8, distance: '5.8 km', quartier: 'Yopougon', telephone: '0501020304' },
];

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [user, setUser] = useState(null);
  const [activeRoleMode, setActiveRoleMode] = useState('client');
  const [loading, setLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('home');

  const [registeredUsers, setRegisteredUsers] = useState([
    { email: 'vendeur@monan.ci', role: 'depot', nom: 'Dépôt Angré', telephone: '0707070707' },
    { email: 'client@monan.ci', role: 'client', nom: 'Kouassi Yves', telephone: '0505050505' }
  ]);

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
      clientNom: 'Kouassi Yves',
      clientPhone: '0708091011',
      type: 'TotalEnergies B12 (12.5 kg)',
      operation: 'Recharge',
      qte: 1,
      total: '5 500 FCFA',
      adresse: 'Angré Star 10',
      status: 'available',
      assignedVendorId: null,
      assignedVendorNom: null,
    },
    {
      id: 'CMD-802',
      date: new Date().toLocaleDateString('fr-FR'),
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
      const stored = await AsyncStorage.getItem('@registered_users');
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

  const activeFormatPrices = vendorPrices[selectedCylinder.id] || { recharge: selectedCylinder.priceRecharge, achat: selectedCylinder.priceAchat };
  const currentUnitPrice = operationType === 'recharge' 
    ? (parseInt(activeFormatPrices.recharge, 10) || selectedCylinder.priceRecharge)
    : (parseInt(activeFormatPrices.achat, 10) || selectedCylinder.priceAchat);

  const handleToggleRoleMode = () => {
    if (user && user.role === 'depot') {
      const newMode = activeRoleMode === 'depot' ? 'client' : 'depot';
      setActiveRoleMode(newMode);
      setDashboardTab('home');
    }
  };

  const handleRegister = async (type) => {
    if (!nom || !telephone || !email || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir les champs obligatoires.');
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const newUser = {
      id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      nom: nom.trim(),
      email: cleanEmail,
      telephone: telephone.trim(),
      adresse: adresse.trim() || 'Abidjan',
      role: type,
      createdAt: new Date().toISOString(),
      isSubscribed: false
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);

    try {
      await AsyncStorage.setItem('@registered_users', JSON.stringify(updatedUsers));
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
    }

    setUser(newUser);
    setActiveRoleMode(type);
    setAdresseLivraison(adresse.trim());
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
      const stored = await AsyncStorage.getItem('@registered_users');
      if (stored) {
        storedUsers = JSON.parse(stored);
        setRegisteredUsers(storedUsers);
      }
    } catch (e) {
      console.log('Erreur lecture utilisateurs:', e);
    }

    const foundUser = storedUsers.find(u => u.email === cleanEmail);

    let userRole = 'client';
    let userName = cleanEmail.split('@')[0];

    if (foundUser) {
      userRole = foundUser.role;
      userName = foundUser.nom;
    } else if (cleanEmail.includes('depot') || cleanEmail.includes('vendeur') || cleanEmail.includes('pro')) {
      userRole = 'depot';
    }

    const userData = {
      id: userRole === 'depot' ? 'DEP-CURRENT' : 'CLI-CURRENT',
      email: cleanEmail,
      nom: userName,
      role: userRole,
      createdAt: new Date().toISOString(),
      isSubscribed: false
    };

    setUser(userData);
    setActiveRoleMode(userRole);
    setDashboardTab('home');
    setLoading(false);
  };

  const handleCreateOrder = () => {
    if (!adresseLivraison) return Alert.alert('Adresse requise', 'Précisez votre lieu de livraison.');

    setLoading(true);

    const qteNum = parseInt(quantite, 10) || 1;
    const totalCalculated = qteNum * currentUnitPrice;
    const newCmdId = `CMD-${Math.floor(100 + Math.random() * 900)}`;

    const newCmd = {
      id: newCmdId,
      date: new Date().toLocaleDateString('fr-FR'),
      clientNom: user?.nom || 'Client',
      clientPhone: user?.telephone || 'Non renseigné',
      type: `${selectedMarque.name} ${selectedCylinder.name}`,
      operation: operationType === 'recharge' ? 'Recharge' : 'Achat Neuf',
      qte: qteNum,
      status: 'available',
      assignedVendorId: null,
      assignedVendorNom: null,
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

    Alert.alert('Commande acceptée', 'Cette commande est réservée pour votre dépôt.');
  };

  const handleMarkAsDelivered = (orderId) => {
    setAllOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          return { ...order, status: 'delivered' };
        }
        return order;
      })
    );
    Alert.alert('Succès', 'Commande livrée.');
  };

  const handleLogout = () => {
    setUser(null);
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

  const availableOrdersForVendors = allOrders.filter(cmd => cmd.status === 'available');
  const myAcceptedOrders = allOrders.filter(cmd => cmd.assignedVendorId === user?.id && cmd.status === 'accepted');
  const myClientOrders = allOrders.filter(cmd => cmd.clientNom === user?.nom || user?.role === 'client');

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
            <Text style={styles.brandSub}>
              {user ? (activeRoleMode === 'depot' ? 'ESPACE VENDEUR' : 'ESPACE CLIENT') : 'GAZ EN LIGNE'}
            </Text>
          </View>
        </View>

        {user && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {user.role === 'depot' && (
              <AnimatedButton style={styles.roleToggleBtn} onPress={handleToggleRoleMode}>
                <Text style={styles.roleToggleBtnText}>
                  {activeRoleMode === 'depot' ? 'Vue Client' : 'Vue Vendeur'}
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
            <FadeInView key={`${dashboardTab}-${activeRoleMode}`} style={styles.mainWrapper}>
              
              {/* ONGLETS NAVIGATION */}
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
                          Livraisons ({myAcceptedOrders.length})
                        </Text>
                      </AnimatedButton>

                      <AnimatedButton
                        style={[styles.pillBtn, dashboardTab === 'pricing' && styles.pillBtnActive]}
                        onPress={() => setDashboardTab('pricing')}
                      >
                        <Text style={[styles.pillText, dashboardTab === 'pricing' && styles.pillTextActive]}>Mes Prix</Text>
                      </AnimatedButton>
                    </>
                  ) : (
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
                        {user.role === 'depot' ? (activeRoleMode === 'depot' ? 'Mode Vendeur' : 'Mode Client (Vendeur)') : 'Compte Client'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.kpiGrid}>
                    {activeRoleMode === 'depot' ? (
                      <>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>COMMANDES DISPONIBLES</Text>
                          <Text style={styles.kpiCardNum}>{availableOrdersForVendors.length}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                          <Text style={styles.kpiCardTag}>MES LIVRAISONS</Text>
                          <Text style={styles.kpiCardNum}>{myAcceptedOrders.length}</Text>
                        </View>
                      </>
                    ) : (
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

                  {activeRoleMode === 'depot' ? (
                    <View style={{ gap: 10 }}>
                      <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('vendor_live_orders')}>
                        <Text style={styles.actionCardTitle}>Commandes en direct</Text>
                      </AnimatedButton>

                      <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('pricing')}>
                        <Text style={styles.actionCardTitleWhite}>Gérer mes prix</Text>
                      </AnimatedButton>
                    </View>
                  ) : (
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

              {/* COMMANDES VENDEUR */}
              {dashboardTab === 'vendor_live_orders' && activeRoleMode === 'depot' && (
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

              {/* LIVRAISONS VENDEUR */}
              {dashboardTab === 'my_deliveries' && activeRoleMode === 'depot' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Livraisons en cours</Text>
                  {myAcceptedOrders.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>Aucune livraison en cours.</Text>
                  ) : (
                    myAcceptedOrders.map((order) => (
                      <View key={order.id} style={[styles.liveOrderCard, { borderColor: '#4ADE80' }]}>
                        <View style={styles.liveOrderHeader}>
                          <Text style={styles.liveOrderId}>{order.id}</Text>
                          <Text style={[styles.liveOrderBadge, { backgroundColor: 'rgba(74, 222, 128, 0.2)', color: '#4ADE80' }]}>
                            RESERVÉE
                          </Text>
                        </View>
                        <Text style={styles.liveOrderClient}>Client : {order.clientNom}</Text>
                        <Text style={styles.liveOrderArticle}>{order.qte}x {order.type}</Text>
                        <Text style={styles.liveOrderAddress}>Adresse : {order.adresse}</Text>
                        <Text style={styles.liveOrderTotal}>Total : {order.total}</Text>

                        <AnimatedButton style={[styles.btnOrange, { marginTop: 8 }]} onPress={() => handleMarkAsDelivered(order.id)}>
                          <Text style={styles.btnOrangeText}>Valider la livraison</Text>
                        </AnimatedButton>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* DÉPÔTS PROCHES */}
              {dashboardTab === 'depots' && (
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

              {/* CATALOGUE ET COMMANDE CLIENT */}
              {(dashboardTab === 'catalog' || dashboardTab === 'order') && (
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

              {/* MES SUIVIS CLIENT */}
              {dashboardTab === 'orders_list' && (
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={styles.orderRowId}>{cmd.id} • {cmd.date}</Text>
                          <Text style={[
                            styles.orderRowStatus,
                            cmd.status === 'accepted' ? { color: '#4ADE80' } : { color: '#F97316' }
                          ]}>
                            {cmd.status === 'accepted' ? `Acceptée (${cmd.assignedVendorNom})` : 'En attente d\'un dépôt'}
                          </Text>
                        </View>
                        <Text style={styles.orderRowBody}>{cmd.qte}x {cmd.type} ({cmd.operation})</Text>
                        <Text style={styles.orderRowTotal}>{cmd.total}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* PRIX VENDEUR */}
              {dashboardTab === 'pricing' && activeRoleMode === 'depot' && (
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

                  <AnimatedButton style={styles.btnOrange} onPress={() => Alert.alert('Succès', 'Tarifs mis à jour.')}>
                    <Text style={styles.btnOrangeText}>Enregistrer</Text>
                  </AnimatedButton>
                </View>
              )}

            </FadeInView>
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
                    <FadeInView delay={120}>
                      <AnimatedButton style={styles.welcomeCardDark} onPress={() => setCurrentScreen('register_client')}>
                        <Text style={styles.welcomeCardTitleLight}>Espace Client</Text>
                        <Text style={styles.welcomeCardSubLight}>Commandes de gaz</Text>
                      </AnimatedButton>
                    </FadeInView>

                    <FadeInView delay={200}>
                      <AnimatedButton style={styles.welcomeCardWhite} onPress={() => setCurrentScreen('register_depot')}>
                        <Text style={styles.welcomeCardTitleDark}>Espace Vendeur</Text>
                        <Text style={styles.welcomeCardSubDark}>Gérer mon dépôt</Text>
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
                    {currentScreen === 'register_depot' ? 'Inscription Vendeur' : 'Inscription Client'}
                  </Text>

                  <Text style={styles.label}>Nom complet / Dépôt *</Text>
                  <TextInput style={styles.input} placeholder="Ex: Dépôt Angré" placeholderTextColor="#64748B" value={nom} onChangeText={setNom} />

                  <Text style={styles.label}>Téléphone *</Text>
                  <TextInput style={styles.input} keyboardType="phone-pad" placeholder="0700000000" placeholderTextColor="#64748B" value={telephone} onChangeText={setTelephone} />

                  <Text style={styles.label}>Adresse *</Text>
                  <TextInput style={styles.input} placeholder="Quartier, repère..." placeholderTextColor="#64748B" value={adresse} onChangeText={setAdresse} />

                  <Text style={styles.label}>Email *</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@exemple.com" placeholderTextColor="#64748B" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe *</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#64748B" value={password} onChangeText={setPassword} />

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

                  <Text style={styles.label}>Email *</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@exemple.com" placeholderTextColor="#64748B" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe *</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#64748B" value={password} onChangeText={setPassword} />

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
  btnAcceptOrder: { backgroundColor: '#22C55E', paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnAcceptOrderText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },

  emptyStateBox: { backgroundColor: '#1E293B', padding: 20, borderRadius: 12, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155' },
  emptyStateText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

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