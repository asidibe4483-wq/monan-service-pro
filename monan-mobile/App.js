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

// Stepper Ergonomique de Quantité
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

const CYLINDER_TYPES = [
  { id: 'B6', name: 'B6 (6 kg)', price: 2500, icon: '⚡' },
  { id: 'B12', name: 'B12 (12.5 kg)', price: 5500, icon: '🔥' },
  { id: 'B28', name: 'B28 (28 kg)', price: 13000, icon: '🏭' },
];

const PAYMENT_METHODS = [
  { 
    id: 'wave', 
    name: 'Wave', 
    color: '#1DC3F3', 
    logo: require('./assets/wave.jpeg')
  },
  { 
    id: 'orange', 
    name: 'Orange', 
    color: '#FF6600', 
    logo: require('./assets/Orange.jpeg')
  },
  { 
    id: 'mtn', 
    name: 'MTN MoMo', 
    color: '#FFCC00', 
    logo: require('./assets/MTN.jpeg')
  },
  { 
    id: 'moov', 
    name: 'Moov Money', 
    color: '#0055A5', 
    logo: require('./assets/Moov.jpeg')
  },
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

  // Réinitialisation de mot de passe
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1);

  // Abonnement Vendeur
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('wave');
  const [paymentPhone, setPaymentPhone] = useState('');

  // Commande Client
  const [selectedCylinder, setSelectedCylinder] = useState(CYLINDER_TYPES[1]);
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

  useEffect(() => {
    const timer = setTimeout(() => setIsAppReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

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
      Alert.alert('Connexion échouée', error.message);
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

  // 🔒 DEMANDE DE CODE DE RÉINITIALISATION STRICTE
  const handleRequestResetCode = async () => {
    if (!forgotEmail) {
      Alert.alert('Champ requis', 'Veuillez renseigner votre adresse email.');
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
        throw new Error(data.error || "Adresse email non reconnue.");
      }

      // Progression autorisée uniquement si l'email existe
      setResetStep(2);
      Alert.alert('Code envoyé !', data.message || `Un code de sécurité valable 5 minutes a été envoyé à ${forgotEmail.trim()}`);
    } catch (error) {
      Alert.alert('Email introuvable', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔒 VALIDATION DU CODE ET NOUVEAU MOT DE PASSE STRICTE
  const handleConfirmNewPassword = async () => {
    if (!resetCode || !newPassword) {
      Alert.alert('Champs requis', 'Veuillez saisir le code à 6 chiffres reçu et le nouveau mot de passe.');
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
          newPassword: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Code invalide ou expiré.");
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
      Alert.alert('Échec de validation', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSubscription = () => {
    if (!paymentPhone) {
      Alert.alert('Numéro requis', 'Veuillez saisir le numéro de débit Mobile Money.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setUser({ ...user, isSubscribed: true });
      setShowPaymentSection(false);
      Alert.alert('Paiement confirmé', 'Votre abonnement Pass Pro Dépôt est maintenant actif.');
    }, 1400);
  };

  const handleCreateOrder = () => {
    if (!adresseLivraison) {
      Alert.alert('Adresse requise', 'Veuillez préciser votre adresse de livraison.');
      return;
    }

    const qteNum = parseInt(quantite, 10) || 1;
    const totalCalculated = qteNum * selectedCylinder.price;

    const newCmd = {
      id: `CMD-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('fr-FR'),
      type: selectedCylinder.name,
      qte: qteNum,
      statut: 'En cours de livraison',
      codeStatut: 'pending',
      total: `${totalCalculated.toLocaleString('fr-FR')} FCFA`
    };

    setCommandes([newCmd, ...commandes]);
    Alert.alert(
      'Commande enregistrée !',
      `Votre recharge de ${qteNum}x ${selectedCylinder.name} est en cours de préparation.`,
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
              /* ÉCRAN DE PAIEMENT */
              <FadeInView style={styles.mainWrapper}>
                <View style={styles.cardBox}>
                  {user.role === 'depot' && !isTrialExpired && (
                    <AnimatedButton onPress={() => setShowPaymentSection(false)} style={styles.backBtnInline}>
                      <Text style={styles.backBtnInlineText}>← Retour au tableau de bord</Text>
                    </AnimatedButton>
                  )}

                  <Text style={[styles.cardBoxTitle, { textAlign: 'center' }]}>Abonnement Vendeur</Text>
                  <Text style={styles.subTitleCenter}>
                    Sélectionnez votre mode de paiement Mobile Money :
                  </Text>

                  <View style={styles.subCard}>
                    <Text style={styles.subCardBadge}>ACCÈS ILLIMITÉ</Text>
                    <Text style={styles.subCardTitle}>Pass Pro Dépôt</Text>
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
                {/* Bandeau d'essai Vendeur */}
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

                {/* Onglets Défilants */}
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

                {/* ACCUEIL */}
                {dashboardTab === 'home' && (
                  <View style={styles.fullSection}>
                    <View style={styles.userGreetingCard}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {(user.nom || user.email || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.greetingTitle}>Bonjour, {user.nom || 'Cher client'} 👋</Text>
                        <Text style={styles.greetingSubtitle}>
                          {user.role === 'depot' ? 'Gérez vos stocks et votre activité' : 'Rechargez votre bouteille de gaz en quelques clics'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.kpiGrid}>
                      <View style={styles.kpiCard}>
                        <Text style={styles.kpiCardTag}>COMMANDES</Text>
                        <Text style={styles.kpiCardNum}>{commandes.length}</Text>
                      </View>
                      <View style={styles.kpiCard}>
                        <Text style={styles.kpiCardTag}>DÉPÔTS ACTIFS</Text>
                        <Text style={styles.kpiCardNum}>3</Text>
                      </View>
                    </View>

                    {user.role === 'depot' ? (
                      <View style={{ gap: 12 }}>
                        <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('add_stock')}>
                          <Text style={styles.actionCardTitle}>📦 Mettre à jour les stocks</Text>
                          <Text style={styles.actionCardSub}>Modifiez les quantités de bouteilles B6, B12 et B28</Text>
                        </AnimatedButton>

                        {!user.isSubscribed && (
                          <AnimatedButton style={styles.actionCardNavy} onPress={() => setShowPaymentSection(true)}>
                            <Text style={styles.actionCardTitleWhite}>💳 Activer le Pass Pro Dépôt</Text>
                            <Text style={styles.actionCardSubWhite}>Accédez à toutes les fonctionnalités vendeurs</Text>
                          </AnimatedButton>
                        )}
                      </View>
                    ) : (
                      <View style={{ gap: 12 }}>
                        <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('depots')}>
                          <Text style={styles.actionCardTitle}>📍 Trouver un dépôt à proximité</Text>
                          <Text style={styles.actionCardSub}>Consultez la disponibilité en temps réel autour de vous</Text>
                        </AnimatedButton>

                        <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('order')}>
                          <Text style={styles.actionCardTitleWhite}>🚀 Commander une livraison</Text>
                          <Text style={styles.actionCardSubWhite}>Recevez votre recharge directement à domicile</Text>
                        </AnimatedButton>
                      </View>
                    )}
                  </View>
                )}

                {/* DÉPÔTS */}
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

                {/* COMMANDER */}
                {dashboardTab === 'order' && (
                  <View style={styles.cardBox}>
                    <Text style={styles.cardBoxTitle}>Passer une commande</Text>

                    <Text style={styles.label}>Type de bouteille</Text>
                    <View style={styles.cylinderList}>
                      {CYLINDER_TYPES.map((cyl) => {
                        const isSelected = selectedCylinder.id === cyl.id;
                        return (
                          <AnimatedButton
                            key={cyl.id}
                            style={[styles.cylinderItem, isSelected && styles.cylinderItemActive]}
                            onPress={() => setSelectedCylinder(cyl)}
                          >
                            <View style={styles.cylinderHeader}>
                              <Text style={styles.cylinderTitle}>{cyl.icon} {cyl.name}</Text>
                              <Text style={styles.cylinderPrice}>{cyl.price.toLocaleString('fr-FR')} FCFA</Text>
                            </View>
                          </AnimatedButton>
                        );
                      })}
                    </View>

                    <Text style={styles.label}>Quantité désirée</Text>
                    <QuantityStepper value={quantite} onChange={setQuantite} />

                    <Text style={styles.label}>Adresse ou repère de livraison *</Text>
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
                        {((parseInt(quantite, 10) || 1) * selectedCylinder.price).toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>

                    <AnimatedButton style={styles.btnOrange} onPress={handleCreateOrder}>
                      <Text style={styles.btnOrangeText}>Valider la commande</Text>
                    </AnimatedButton>
                  </View>
                )}

                {/* SUIVI */}
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
                          <Text style={styles.emptyIconText}>📦</Text>
                        </View>
                        <Text style={styles.emptyTitle}>Aucune commande enregistrée</Text>
                        <Text style={styles.emptySubtitle}>
                          Vos recharges de gaz commandées s'afficheront ici en temps réel.
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

                {/* STOCK VENDEUR */}
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
                      <Text style={styles.btnOrangeText}>Enregistrer le stock</Text>
                    </AnimatedButton>
                  </View>
                )}

                {/* INVENTAIRE VENDEUR */}
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
              {/* ACCUEIL */}
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
                      <Text style={styles.welcomeCardTitleDark}>Espace Dépôt / Vendeur</Text>
                      <Text style={styles.welcomeCardSubDark}>Gérez vos stocks et recevez des commandes</Text>
                    </AnimatedButton>
                  </View>

                  <AnimatedButton style={styles.btnNavyOutline} onPress={() => setCurrentScreen('login')}>
                    <Text style={styles.btnNavyOutlineText}>Se connecter</Text>
                  </AnimatedButton>
                </View>
              )}

              {/* INSCRIPTIONS */}
              {(currentScreen === 'register_client' || currentScreen === 'register_depot') && (
                <View style={styles.cardBox}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={styles.backBtnInline}>
                    <Text style={styles.backBtnInlineText}>← Retour</Text>
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

              {/* CONNEXION */}
              {currentScreen === 'login' && (
                <View style={styles.cardBox}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={styles.backBtnInline}>
                    <Text style={styles.backBtnInlineText}>← Retour</Text>
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

              {/* RÉINITIALISATION SÉCURISÉE DE MOT DE PASSE */}
              {currentScreen === 'forgot_password' && (
                <View style={styles.cardBox}>
                  <AnimatedButton
                    onPress={() => {
                      if (resetStep === 2) {
                        setResetStep(1);
                      } else {
                        setCurrentScreen('login');
                      }
                    }}
                    style={styles.backBtnInline}
                  >
                    <Text style={styles.backBtnInlineText}>← Retour</Text>
                  </AnimatedButton>

                  <Text style={styles.cardBoxTitle}>Réinitialisation sécurisée</Text>

                  {resetStep === 1 ? (
                    <>
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
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Envoyer le code OTP</Text>}
                      </AnimatedButton>
                    </>
                  ) : (
                    <>
                      <Text style={styles.label}>Code de vérification (valable 5 minutes)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="Ex: 849201"
                        placeholderTextColor="#94A3B8"
                        value={resetCode}
                        onChangeText={setResetCode}
                      />

                      <Text style={styles.label}>Nouveau mot de passe</Text>
                      <TextInput
                        style={styles.input}
                        secureTextEntry
                        placeholder="••••••••"
                        placeholderTextColor="#94A3B8"
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />

                      <AnimatedButton style={styles.btnOrange} onPress={handleConfirmNewPassword} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnOrangeText}>Mettre à jour le mot de passe</Text>}
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
  kpiCardTag: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  kpiCardNum: { fontSize: 22, fontWeight: '900', color: '#F97316', marginTop: 4 },
  
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
  cylinderTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  cylinderPrice: { fontSize: 15, fontWeight: '800', color: '#F97316' },
  
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
  
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
  filterBtnActive: { backgroundColor: '#0F172A' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#475569' },
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