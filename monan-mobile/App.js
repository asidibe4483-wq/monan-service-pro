import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions
} from 'react-native';

const API_URL = "https://monan-backend.onrender.com";

const CYLINDER_TYPES = [
  { id: 'B6', name: 'B6 (6 kg)', price: 2500, desc: 'Compact & facile à transporter', icon: '🔥', popular: false },
  { id: 'B12', name: 'B12 (12.5 kg)', price: 5500, desc: 'Le choix standard des foyers', icon: '⚡', popular: true },
  { id: 'B28', name: 'B28 (28 kg)', price: 13000, desc: 'Usage professionnel & restaurants', icon: '🏭', popular: false },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('home');
  const [focusedInput, setFocusedInput] = useState(null);

  // Authentification
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

  // Suivi des commandes
  const [commandes, setCommandes] = useState([
    { id: 'CMD-108', date: '29/10/2026', type: 'B12 (12.5 kg)', qte: 1, statut: 'En cours de livraison', total: '5 500 FCFA', codeStatut: 'pending' },
    { id: 'CMD-094', date: '15/10/2026', type: 'B6 (6 kg)', qte: 2, statut: 'Livrée avec succès', total: '5 000 FCFA', codeStatut: 'delivered' }
  ]);

  // Stocks Vendeur
  const [stockB6, setStockB6] = useState('24');
  const [stockB12, setStockB12] = useState('42');
  const [stockB28, setStockB28] = useState('10');

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
        throw new Error(data.message || data.error || 'Connexion échouée.');
      }

      const userData = data.user || { email, role: 'client', nom: data.nom || email.split('@')[0] };
      setUser(userData);
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
      Alert.alert('Champs requis', 'Veuillez remplir les informations obligatoires (*).');
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
      Alert.alert('Bienvenue !', 'Votre compte Monan Service a été créé avec succès.');
    } catch (error) {
      Alert.alert('Inscription échouée', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    if (!adresseLivraison) {
      Alert.alert('Adresse requise', 'Veuillez indiquer l\'adresse exacte de livraison.');
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
      'Commande enregistrée !',
      `Votre commande de ${qteNum}x ${selectedCylinder.name} est prise en compte.`,
      [{ text: 'Voir le suivi', onPress: () => setDashboardTab('orders_list') }]
    );
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('welcome');
    setDashboardTab('home');
  };

  const filteredCommandes = commandes.filter(cmd => {
    if (orderFilter === 'pending') return cmd.codeStatut === 'pending';
    if (orderFilter === 'delivered') return cmd.codeStatut === 'delivered';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* App Bar Navigation */}
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
              {user ? (user.role === 'depot' ? 'ESPACE DÉPÔT / VENDEUR' : 'ESPACE CLIENT') : 'SERVICES DE GAZ & RECHARGE'}
            </Text>
          </View>
        </View>

        {user && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.logoutBtnText}>Déconnexion</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {user ? (
            <View>
              {/* Onglets de navigation */}
              <View style={styles.pillsContainer}>
                <TouchableOpacity
                  style={[styles.pillBtn, dashboardTab === 'home' && styles.pillBtnActive]}
                  onPress={() => setDashboardTab('home')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, dashboardTab === 'home' && styles.pillTextActive]}>Vue d'ensemble</Text>
                </TouchableOpacity>

                {user.role === 'depot' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.pillBtn, dashboardTab === 'add_stock' && styles.pillBtnActive]}
                      onPress={() => setDashboardTab('add_stock')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, dashboardTab === 'add_stock' && styles.pillTextActive]}>+ Stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pillBtn, dashboardTab === 'sales_list' && styles.pillBtnActive]}
                      onPress={() => setDashboardTab('sales_list')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, dashboardTab === 'sales_list' && styles.pillTextActive]}>Inventaire</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.pillBtn, dashboardTab === 'order' && styles.pillBtnActive]}
                      onPress={() => setDashboardTab('order')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, dashboardTab === 'order' && styles.pillTextActive]}>Commander</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pillBtn, dashboardTab === 'orders_list' && styles.pillBtnActive]}
                      onPress={() => setDashboardTab('orders_list')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, dashboardTab === 'orders_list' && styles.pillTextActive]}>Suivi ({commandes.length})</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* VUE D'ENSEMBLE */}
              {dashboardTab === 'home' && (
                <View>
                  <View style={styles.welcomeBanner}>
                    <Text style={styles.welcomeBannerTitle}>Bonjour, {user.nom || user.email} 👋</Text>
                    <Text style={styles.welcomeBannerSub}>
                      {user.role === 'depot' ? 'Ajustez votre stock et suivez les ventes récents.' : 'Passez une commande de gaz et suivez la livraison en direct.'}
                    </Text>
                  </View>

                  <Text style={styles.sectionTitle}>Indicateurs clés</Text>
                  <View style={styles.kpiGrid}>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardTag}>COMMANDES</Text>
                      <Text style={styles.kpiCardNum}>{commandes.length}</Text>
                      <Text style={styles.kpiCardSub}>Historique total</Text>
                    </View>
                    <View style={styles.kpiCard}>
                      <Text style={styles.kpiCardTag}>FORMAT FAVORIS</Text>
                      <Text style={styles.kpiCardNum}>B12</Text>
                      <Text style={styles.kpiCardSub}>Standard 12.5 kg</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Action rapide</Text>
                  {user.role === 'depot' ? (
                    <TouchableOpacity style={styles.actionCardOrange} onPress={() => setDashboardTab('add_stock')}>
                      <Text style={styles.actionCardTitle}>📦 Mettre à jour les stocks du dépôt</Text>
                      <Text style={styles.actionCardSub}>Modifiez les quantités de bouteilles B6, B12 et B28 disponibles.</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.actionCardOrange} onPress={() => setDashboardTab('order')}>
                      <Text style={styles.actionCardTitle}>🚀 Commander une nouvelle recharge</Text>
                      <Text style={styles.actionCardSub}>Sélectionnez la bouteille de votre choix et renseignez votre adresse.</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* COMMANDE INTERACTIVE */}
              {dashboardTab === 'order' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Passez votre commande</Text>
                  <Text style={styles.cardBoxSub}>Choisissez le type de bouteille de gaz :</Text>

                  <View style={styles.cylinderList}>
                    {CYLINDER_TYPES.map((cyl) => {
                      const isSelected = selectedCylinder.id === cyl.id;
                      return (
                        <TouchableOpacity
                          key={cyl.id}
                          style={[styles.cylinderItem, isSelected && styles.cylinderItemActive]}
                          onPress={() => setSelectedCylinder(cyl)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.cylinderHeader}>
                            <Text style={styles.cylinderIcon}>{cyl.icon}</Text>
                            {cyl.popular && <Text style={styles.popularBadge}>POPULAIRE</Text>}
                          </View>
                          <Text style={[styles.cylinderTitle, isSelected && styles.cylinderTitleActive]}>{cyl.name}</Text>
                          <Text style={styles.cylinderPrice}>{cyl.price.toLocaleString('fr-FR')} FCFA</Text>
                          <Text style={styles.cylinderDesc}>{cyl.desc}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Quantité</Text>
                  <TextInput
                    style={[styles.input, focusedInput === 'qte' && styles.inputFocused]}
                    onFocus={() => setFocusedInput('qte')}
                    onBlur={() => setFocusedInput(null)}
                    keyboardType="numeric"
                    value={quantite}
                    onChangeText={setQuantite}
                  />

                  <Text style={styles.label}>Adresse de livraison *</Text>
                  <TextInput
                    style={[styles.input, focusedInput === 'adrL' && styles.inputFocused]}
                    onFocus={() => setFocusedInput('adrL')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="Quartier, rue ou point de repère"
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

                  <TouchableOpacity style={styles.btnOrange} onPress={handleCreateOrder} activeOpacity={0.8}>
                    <Text style={styles.btnOrangeText}>Valider la commande</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* HISTORIQUE ET SUIVI */}
              {dashboardTab === 'orders_list' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Suivi des commandes</Text>

                  <View style={styles.filterRow}>
                    <TouchableOpacity style={[styles.filterBtn, orderFilter === 'all' && styles.filterBtnActive]} onPress={() => setOrderFilter('all')}>
                      <Text style={[styles.filterText, orderFilter === 'all' && styles.filterTextActive]}>Toutes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtn, orderFilter === 'pending' && styles.filterBtnActive]} onPress={() => setOrderFilter('pending')}>
                      <Text style={[styles.filterText, orderFilter === 'pending' && styles.filterTextActive]}>En cours</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterBtn, orderFilter === 'delivered' && styles.filterBtnActive]} onPress={() => setOrderFilter('delivered')}>
                      <Text style={[styles.filterText, orderFilter === 'delivered' && styles.filterTextActive]}>Livrées</Text>
                    </TouchableOpacity>
                  </View>

                  {filteredCommandes.map((cmd) => (
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
                  ))}
                </View>
              )}

              {/* GESTION STOCK (DEPOT) */}
              {dashboardTab === 'add_stock' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>Mise à jour des stocks</Text>
                  <Text style={styles.label}>Bouteilles B6 (6 kg)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={stockB6} onChangeText={setStockB6} />
                  <Text style={styles.label}>Bouteilles B12 (12.5 kg)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={stockB12} onChangeText={setStockB12} />
                  <Text style={styles.label}>Bouteilles B28 (28 kg)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={stockB28} onChangeText={setStockB28} />
                  <TouchableOpacity style={styles.btnOrange} onPress={() => Alert.alert('Succès', 'Les quantités en stock ont été mises à jour.')}>
                    <Text style={styles.btnOrangeText}>Enregistrer la mise à jour</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* INVENTAIRE DEPOT */}
              {dashboardTab === 'sales_list' && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardBoxTitle}>État actuel du dépôt</Text>
                  <Text style={styles.stockItem}>• Stock B6 (6 kg) : {stockB6} unités</Text>
                  <Text style={styles.stockItem}>• Stock B12 (12.5 kg) : {stockB12} unités</Text>
                  <Text style={styles.stockItem}>• Stock B28 (28 kg) : {stockB28} unités</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              {currentScreen === 'welcome' && (
                <View>
                  <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>Livraison & Distribution de Gaz</Text>
                    <Text style={styles.heroSub}>Commandez vos recharges de gaz directement ou gérez les stocks de votre dépôt.</Text>
                  </View>

                  <TouchableOpacity style={styles.welcomeCardDark} onPress={() => setCurrentScreen('register_client')} activeOpacity={0.85}>
                    <Text style={styles.welcomeCardTag}>ESPACE CLIENT</Text>
                    <Text style={styles.welcomeCardTitleLight}>Particuliers & Entreprises</Text>
                    <Text style={styles.welcomeCardSubLight}>Commandez et faites-vous livrer vos bouteilles à domicile rapidement.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.welcomeCardWhite} onPress={() => setCurrentScreen('register_depot')} activeOpacity={0.85}>
                    <Text style={styles.welcomeCardTagNavy}>ESPACE DÉPÔT</Text>
                    <Text style={styles.welcomeCardTitleDark}>Vendeurs & Dépôts de Gaz</Text>
                    <Text style={styles.welcomeCardSubDark}>Gérez vos réserves et recevez les commandes des clients à proximité.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.btnNavyOutline} onPress={() => setCurrentScreen('login')} activeOpacity={0.8}>
                    <Text style={styles.btnNavyOutlineText}>Se connecter à un compte existant</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(currentScreen === 'register_client' || currentScreen === 'register_depot') && (
                <View style={styles.cardBox}>
                  <TouchableOpacity onPress={() => setCurrentScreen('welcome')} style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#F97316', fontWeight: '700' }}>← Retour à l'accueil</Text>
                  </TouchableOpacity>
                  <Text style={styles.cardBoxTitle}>{currentScreen === 'register_depot' ? 'Compte Vendeur / Dépôt' : 'Créer un Compte Client'}</Text>

                  <Text style={styles.label}>Nom complet *</Text>
                  <TextInput style={styles.input} placeholder="Ex: Jean Kouassi" value={nom} onChangeText={setNom} />

                  <Text style={styles.label}>Numéro de téléphone *</Text>
                  <TextInput style={styles.input} keyboardType="phone-pad" placeholder="07 00 00 00 00" value={telephone} onChangeText={setTelephone} />

                  <Text style={styles.label}>Adresse / Quartier</Text>
                  <TextInput style={styles.input} placeholder="Ex: Cocody Angré" value={adresse} onChangeText={setAdresse} />

                  <Text style={styles.label}>Email *</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="adresse@email.com" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe *</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" value={password} onChangeText={setPassword} />

                  <TouchableOpacity style={styles.btnOrange} onPress={() => handleRegister(currentScreen === 'register_depot' ? 'depot' : 'client')} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnOrangeText}>S'inscrire</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {currentScreen === 'login' && (
                <View style={styles.cardBox}>
                  <TouchableOpacity onPress={() => setCurrentScreen('welcome')} style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#F97316', fontWeight: '700' }}>← Retour à l'accueil</Text>
                  </TouchableOpacity>
                  <Text style={styles.cardBoxTitle}>Connexion</Text>

                  <Text style={styles.label}>Adresse Email</Text>
                  <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="adresse@email.com" value={email} onChangeText={setEmail} />

                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="••••••••" value={password} onChangeText={setPassword} />

                  <TouchableOpacity style={styles.btnOrange} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnOrangeText}>Se connecter</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  appBar: { backgroundColor: '#0F172A', paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#F97316' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBadge: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  brandLogoImage: { width: 28, height: 28 },
  brandTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  brandSub: { color: '#94A3B8', fontSize: 9, fontWeight: '700' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  logoutBtnText: { color: '#F87171', fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  pillsContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', padding: 4, borderRadius: 12, marginBottom: 16, gap: 4 },
  pillBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  pillBtnActive: { backgroundColor: '#FFFFFF', elevation: 2 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pillTextActive: { color: '#0F172A' },
  welcomeBanner: { backgroundColor: '#0F172A', borderRadius: 16, padding: 18, marginBottom: 16 },
  welcomeBannerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  welcomeBannerSub: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  kpiCardTag: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  kpiCardNum: { fontSize: 20, fontWeight: '900', color: '#F97316', marginTop: 2 },
  kpiCardSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  actionCardOrange: { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#F97316', borderRadius: 14, padding: 16, marginBottom: 12 },
  actionCardTitle: { fontSize: 15, fontWeight: '800', color: '#C2410C' },
  actionCardSub: { fontSize: 12, color: '#9A3412', marginTop: 2 },
  cardBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  cardBoxTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  cardBoxSub: { fontSize: 12, color: '#64748B', marginBottom: 14 },
  cylinderList: { gap: 10, marginBottom: 16 },
  cylinderItem: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0' },
  cylinderItemActive: { backgroundColor: '#FFF7ED', borderColor: '#F97316' },
  cylinderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cylinderIcon: { fontSize: 22 },
  popularBadge: { backgroundColor: '#F97316', color: '#FFF', fontSize: 9, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cylinderTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  cylinderTitleActive: { color: '#C2410C' },
  cylinderPrice: { fontSize: 14, fontWeight: '800', color: '#F97316' },
  cylinderDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 14 },
  inputFocused: { borderColor: '#F97316', backgroundColor: '#FFFFFF' },
  totalSummary: { backgroundColor: '#0F172A', padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  totalSummaryLabel: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  totalSummaryValue: { color: '#F97316', fontSize: 18, fontWeight: '900' },
  btnOrange: { backgroundColor: '#F97316', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnOrangeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
  filterBtnActive: { backgroundColor: '#0F172A' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterTextActive: { color: '#FFFFFF' },
  orderRow: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginBottom: 8 },
  orderRowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderRowId: { fontWeight: '800', color: '#0F172A' },
  statusOrange: { color: '#D97706', fontWeight: '800', fontSize: 11 },
  statusGreen: { color: '#16A34A', fontWeight: '800', fontSize: 11 },
  orderRowBody: { fontSize: 13, color: '#334155', marginVertical: 4 },
  orderRowFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  orderRowDate: { fontSize: 11, color: '#94A3B8' },
  orderRowTotal: { color: '#F97316', fontWeight: '800' },
  stockItem: { fontSize: 14, color: '#334155', marginVertical: 4 },
  heroSection: { marginVertical: 12 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  heroSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  welcomeCardDark: { backgroundColor: '#0F172A', borderRadius: 16, padding: 18, marginBottom: 12 },
  welcomeCardWhite: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  welcomeCardTag: { backgroundColor: '#F97316', color: '#FFF', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  welcomeCardTagNavy: { backgroundColor: '#F1F5F9', color: '#0F172A', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  welcomeCardTitleLight: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  welcomeCardSubLight: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  welcomeCardTitleDark: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  welcomeCardSubDark: { color: '#64748B', fontSize: 12, marginTop: 4 },
  btnNavyOutline: { borderWidth: 1.5, borderColor: '#0F172A', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnNavyOutlineText: { color: '#0F172A', fontWeight: '800', fontSize: 14 }
});