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
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
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
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 6,
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

const CYLINDER_TYPES = [
  { id: 'B6', name: 'B6 (6 kg)', price: 2500, icon: '🔥', popular: false },
  { id: 'B12', name: 'B12 (12.5 kg)', price: 5500, icon: '⚡', popular: true },
  { id: 'B28', name: 'B28 (28 kg)', price: 13000, icon: '🏭', popular: false },
];

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [user, setUser] = useState(null); // Aucun compte préchargé
  const [loading, setLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('home');

  // Formulaire vierge
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');

  // Commande Client
  const [selectedCylinder, setSelectedCylinder] = useState(CYLINDER_TYPES[1]);
  const [quantite, setQuantite] = useState('1');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');

  // Dépôts de démonstration
  const [searchDepot, setSearchDepot] = useState('');
  const [depotsList] = useState([
    { id: 'DEP-01', nom: 'Dépôt Angré 8ème Tranche', distance: '0.8 km', quartier: 'Cocody Angré', statut: 'Ouvert', b6: 14, b12: 28, b28: 5 },
    { id: 'DEP-02', nom: 'Dépôt Saint-Jean', distance: '2.3 km', quartier: 'Cocody Centre', statut: 'Ouvert', b6: 8, b12: 12, b28: 0 },
    { id: 'DEP-03', nom: 'Dépôt Yopougon Maroc', distance: '5.1 km', quartier: 'Yopougon', statut: 'Ouvert', b6: 22, b12: 35, b28: 10 },
  ]);

  // Commandes vierges
  const [commandes, setCommandes] = useState([]);

  // Stocks Vendeur
  const [stockB6, setStockB6] = useState('0');
  const [stockB12, setStockB12] = useState('0');
  const [stockB28, setStockB28] = useState('0');

  useEffect(() => {
    const timer = setTimeout(() => setIsAppReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez saisir votre email et mot de passe.');
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
        throw new Error(data.message || data.error || 'Identifiants incorrects.');
      }

      const userData = data.user || { email, role: 'client', nom: data.nom || email.split('@')[0] };
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
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires (*).');
      return;
    }

    setLoading(true);
    const endpoint = type === 'depot' ? '/api/auth/register-depot' : '/api/auth/register-client';

    try {
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
        throw new Error(data.message || data.error || 'Erreur d\'inscription.');
      }

      const newUser = data.user || { nom, email, telephone, adresse, role: type };
      setUser(newUser);
      setAdresseLivraison(adresse.trim());
      setDashboardTab('home');
      Alert.alert('Succès', 'Compte créé avec succès !');
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    if (!adresseLivraison) {
      Alert.alert('Adresse requise', 'Indiquez votre adresse de livraison.');
      return;
    }

    const qteNum = parseInt(quantite) || 1;
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
      'Commande enregistrée',
      `Livraison de ${qteNum}x ${selectedCylinder.name} en cours.`,
      [{ text: 'Voir le suivi', onPress: () => setDashboardTab('orders_list') }]
    );
  };

  const handleLogout = () => {
    setUser(null);
    setEmail('');
    setPassword('');
    setNom('');
    setTelephone('');
    setAdresse('');
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
        <ActivityIndicator size="small" color="#F97316" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* Barre d'en-tête */}
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
              {user ? (user.role === 'depot' ? 'ESPACE DÉPÔT' : 'ESPACE CLIENT') : 'LIVRAISON & DISTRIBUTION DE GAZ'}
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
            <FadeInView key={dashboardTab} style={styles.mainWrapper}>
              {/* Onglets de navigation */}
              <View style={styles.pillsContainer}>
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
                      <Text style={[styles.pillText, dashboardTab === 'add_stock' && styles.pillTextActive]}>Stock</Text>
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
                      <Text style={[styles.pillText, dashboardTab === 'orders_list' && styles.pillTextActive]}>Suivi ({commandes.length})</Text>
                    </AnimatedButton>
                  </>
                )}
              </View>

              {/* VUE D'ENSEMBLE */}
              {dashboardTab === 'home' && (
                <View style={styles.fullSection}>
                  <View style={styles.welcomeBanner}>
                    <Text style={styles.welcomeBannerTitle}>Bonjour, {user.nom || user.email} 👋</Text>
                    <Text style={styles.welcomeBannerSub}>
                      {user.role === 'depot' ? 'Gérez vos réserves et traitez les commandes reçues.' : 'Commandez vos recharges de gaz et localisez les dépôts proches.'}
                    </Text>
                  </View>

                  <View style={styles.kpiGrid}>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardTag}>COMMANDES</Text>
                      <Text style={styles.kpiCardNum}>{commandes.length}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardTag}>DÉPÔTS PROCHES</Text>
                      <Text style={styles.kpiCardNum}>3</Text>
                    </View>
                  </View>

                  {user.role === 'depot' ? (
                    <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('add_stock')}>
                      <Text style={styles.actionCardTitle}>📦 Gestion des stocks</Text>
                      <Text style={styles.actionCardSub}>Ajustez le niveau de vos bouteilles B6, B12 et B28.</Text>
                    </AnimatedButton>
                  ) : (
                    <View style={{ gap: 12 }}>
                      <AnimatedButton style={styles.actionCardOrange} onPress={() => setDashboardTab('depots')}>
                        <Text style={styles.actionCardTitle}>📍 Trouver un dépôt à proximité</Text>
                        <Text style={styles.actionCardSub}>Vérifiez la disponibilité du gaz en temps réel.</Text>
                      </AnimatedButton>

                      <AnimatedButton style={styles.actionCardNavy} onPress={() => setDashboardTab('order')}>
                        <Text style={styles.actionCardTitleWhite}>🚀 Commander une recharge</Text>
                        <Text style={styles.actionCardSubWhite}>Livraison rapide à l'adresse de votre choix.</Text>
                      </AnimatedButton>
                    </View>
                  )}
                </View>
              )}

              {/* DÉPÔTS PROCHES */}
              {dashboardTab === 'depots' && (
                <View style={[styles.cardBox, { flex: 1 }]}>
                  <Text style={styles.cardBoxTitle}>Dépôts à proximité 📍</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="🔍 Recherche par quartier..."
                    placeholderTextColor="#94A3B8"
                    value={searchDepot}
                    onChangeText={setSearchDepot}
                  />

                  {filteredDepots.map((depot) => (
                    <View key={depot.id} style={styles.depotCard}>
                      <View style={styles.depotHeader}>
                        <View>
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
                        <Text style={styles.btnDepotSelectText}>Commander ici</Text>
                      </AnimatedButton>
                    </View>
                  ))}
                </View>
              )}

              {/* COMMANDE */}
              {dashboardTab === 'order' && (
                <View style={[styles.cardBox, { flex: 1 }]}>
                  <Text style={styles.cardBoxTitle}>Passer une commande</Text>

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

                  <Text style={styles.label}>Quantité</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={quantite}
                    onChangeText={setQuantite}
                  />

                  <Text style={styles.label}>Adresse de livraison *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Quartier, point de repère"
                    placeholderTextColor="#94A3B8"
                    value={adresseLivraison}
                    onChangeText={setAdresseLivraison}
                  />

                  <View style={styles.totalSummary}>
                    <Text style={styles.totalSummaryLabel}>Montant Total :</Text>
                    <Text style={styles.totalSummaryValue}>
                      {((parseInt(quantite) || 1) * selectedCylinder.price).toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>

                  <AnimatedButton style={styles.btnOrange} onPress={handleCreateOrder}>
                    <Text style={styles.btnOrangeText}>Valider la commande</Text>
                  </AnimatedButton>
                </View>
              )}

              {/* SUIVI */}
              {dashboardTab === 'orders_list' && (
                <View style={[styles.cardBox, { flex: 1 }]}>
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
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>Aucune commande enregistrée pour le moment.</Text>
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

              {/* DÉPÔT STOCK */}
              {dashboardTab === 'add_stock' && (
                <View style={[styles.cardBox, { flex: 1 }]}>
                  <Text style={styles.cardBoxTitle}>Mise à jour des stocks</Text>
                  <Text style={styles.label}>Bouteilles B6 (6 kg)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={stockB6} onChangeText={setStockB6} />
                  <Text style={styles.label}>Bouteilles B12 (12.5 kg)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={stockB12} onChangeText={setStockB12} />
                  <Text style={styles.label}>Bouteilles B28 (28 kg)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={stockB28} onChangeText={setStockB28} />
                  <AnimatedButton style={styles.btnOrange} onPress={() => Alert.alert('Succès', 'Stock mis à jour.')}>
                    <Text style={styles.btnOrangeText}>Enregistrer le stock</Text>
                  </AnimatedButton>
                </View>
              )}

              {/* INVENTAIRE */}
              {dashboardTab === 'sales_list' && (
                <View style={[styles.cardBox, { flex: 1 }]}>
                  <Text style={styles.cardBoxTitle}>État actuel du dépôt</Text>
                  <Text style={styles.stockItem}>• Bouteilles B6 : {stockB6} disponibles</Text>
                  <Text style={styles.stockItem}>• Bouteilles B12 : {stockB12} disponibles</Text>
                  <Text style={styles.stockItem}>• Bouteilles B28 : {stockB28} disponibles</Text>
                </View>
              )}
            </FadeInView>
          ) : (
            <FadeInView key={currentScreen} style={styles.mainWrapper}>
              {currentScreen === 'welcome' && (
                <View style={styles.welcomeContainer}>
                  <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>Distribution & Livraison de Gaz</Text>
                    <Text style={styles.heroSub}>Bienvenue sur Monan Service. Sélectionnez votre profil pour continuer.</Text>
                  </View>

                  <View style={styles.cardsWrapper}>
                    <AnimatedButton style={styles.welcomeCardDark} onPress={() => setCurrentScreen('register_client')}>
                      <Text style={styles.welcomeCardTag}>ESPACE CLIENT</Text>
                      <Text style={styles.welcomeCardTitleLight}>Particuliers & Entreprises</Text>
                      <Text style={styles.welcomeCardSubLight}>Commandez vos recharges de gaz et faites-vous livrer rapidement.</Text>
                    </AnimatedButton>

                    <AnimatedButton style={styles.welcomeCardWhite} onPress={() => setCurrentScreen('register_depot')}>
                      <Text style={styles.welcomeCardTagNavy}>ESPACE DÉPÔT</Text>
                      <Text style={styles.welcomeCardTitleDark}>Vendeurs & Dépôts de Gaz</Text>
                      <Text style={styles.welcomeCardSubDark}>Gérez vos réserves et recevez les commandes des clients proches.</Text>
                    </AnimatedButton>
                  </View>

                  <AnimatedButton style={styles.btnNavyOutline} onPress={() => setCurrentScreen('login')}>
                    <Text style={styles.btnNavyOutlineText}>Se connecter à un compte existant</Text>
                  </AnimatedButton>
                </View>
              )}

              {(currentScreen === 'register_client' || currentScreen === 'register_depot') && (
                <View style={[styles.cardBox, { flex: 1 }]}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={{ marginBottom: 14 }}>
                    <Text style={{ color: '#F97316', fontWeight: '700' }}>← Retour</Text>
                  </AnimatedButton>
                  <Text style={styles.cardBoxTitle}>{currentScreen === 'register_depot' ? 'Créer un compte Dépôt' : 'Créer un compte Client'}</Text>

                  <Text style={styles.label}>Nom complet *</Text>
                  <TextInput style={styles.input} placeholder="Ex: Jean Kouassi" value={nom} onChangeText={setNom} />

                  <Text style={styles.label}>Téléphone *</Text>
                  <TextInput style={styles.input} keyboardType="phone-pad" placeholder="07 00 00 00 00" value={telephone} onChangeText={setTelephone} />

                  <Text style={styles.label}>Adresse / Quartier</Text>
                  <TextInput style={styles.input} placeholder="Ex: Cocody Angré" value={adresse} onChangeText={setAdresse} />

                  <Text style={styles.label}>Email *</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@exemple.com" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe *</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" value={password} onChangeText={setPassword} />

                  <AnimatedButton style={styles.btnOrange} onPress={() => handleRegister(currentScreen === 'register_depot' ? 'depot' : 'client')} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnOrangeText}>Finaliser l'inscription</Text>}
                  </AnimatedButton>
                </View>
              )}

              {currentScreen === 'login' && (
                <View style={[styles.cardBox, { flex: 1 }]}>
                  <AnimatedButton onPress={() => setCurrentScreen('welcome')} style={{ marginBottom: 14 }}>
                    <Text style={{ color: '#F97316', fontWeight: '700' }}>← Retour</Text>
                  </AnimatedButton>
                  <Text style={styles.cardBoxTitle}>Connexion</Text>

                  <Text style={styles.label}>Email</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="email@exemple.com" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" value={password} onChangeText={setPassword} />

                  <AnimatedButton style={styles.btnOrange} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnOrangeText}>Se connecter</Text>}
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  splashContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 100, height: 100, marginBottom: 16 },
  splashTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  appBar: { backgroundColor: '#0F172A', paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#F97316' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandBadge: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  brandLogoImage: { width: 28, height: 28 },
  brandTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  brandSub: { color: '#94A3B8', fontSize: 9, fontWeight: '700' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutBtnText: { color: '#F87171', fontSize: 12, fontWeight: '700' },
  scrollContent: { flexGrow: 1, padding: 18 },
  mainWrapper: { flex: 1, justifyContent: 'space-between' },
  welcomeContainer: { flex: 1, justifyContent: 'space-between' },
  fullSection: { flex: 1, justifyContent: 'flex-start' },
  pillsContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', padding: 4, borderRadius: 12, marginBottom: 18, gap: 6 },
  pillBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  pillBtnActive: { backgroundColor: '#FFFFFF', elevation: 2 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pillTextActive: { color: '#0F172A' },
  welcomeBanner: { backgroundColor: '#0F172A', borderRadius: 16, padding: 18, marginBottom: 16 },
  welcomeBannerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  welcomeBannerSub: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  kpiCardTag: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  kpiCardNum: { fontSize: 22, fontWeight: '900', color: '#F97316', marginTop: 4 },
  actionCardOrange: { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#F97316', borderRadius: 14, padding: 18 },
  actionCardTitle: { fontSize: 15, fontWeight: '800', color: '#C2410C' },
  actionCardSub: { fontSize: 12, color: '#9A3412', marginTop: 2 },
  actionCardNavy: { backgroundColor: '#0F172A', borderRadius: 14, padding: 18 },
  actionCardTitleWhite: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  actionCardSubWhite: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  cardBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  cardBoxTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  depotCard: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 12 },
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
  btnDepotSelect: { backgroundColor: '#0F172A', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnDepotSelectText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  cylinderList: { gap: 10, marginBottom: 16 },
  cylinderItem: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  cylinderItemActive: { backgroundColor: '#FFF7ED', borderColor: '#F97316' },
  cylinderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cylinderTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  cylinderPrice: { fontSize: 15, fontWeight: '800', color: '#F97316' },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 14 },
  totalSummary: { backgroundColor: '#0F172A', padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  totalSummaryLabel: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  totalSummaryValue: { color: '#F97316', fontSize: 18, fontWeight: '900' },
  btnOrange: { backgroundColor: '#F97316', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnOrangeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
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
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },
  stockItem: { fontSize: 14, color: '#334155', marginVertical: 6 },
  heroSection: { marginVertical: 16 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  heroSub: { fontSize: 13, color: '#64748B', marginTop: 6 },
  cardsWrapper: { gap: 14, marginVertical: 12 },
  welcomeCardDark: { backgroundColor: '#0F172A', borderRadius: 16, padding: 20 },
  welcomeCardWhite: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  welcomeCardTag: { backgroundColor: '#F97316', color: '#FFF', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  welcomeCardTagNavy: { backgroundColor: '#F1F5F9', color: '#0F172A', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  welcomeCardTitleLight: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  welcomeCardSubLight: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  welcomeCardTitleDark: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  welcomeCardSubDark: { color: '#64748B', fontSize: 12, marginTop: 4 },
  btnNavyOutline: { borderWidth: 1.5, borderColor: '#0F172A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  btnNavyOutlineText: { color: '#0F172A', fontWeight: '800', fontSize: 14 }
});