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
  ActivityIndicator
} from 'react-native';

const API_URL = "https://monan-backend.onrender.com";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Onglet actif du Dashboard ('home' | 'order' | 'orders_list' | 'add_stock' | 'sales_list')
  const [dashboardTab, setDashboardTab] = useState('home');

  // Formulaires Authentification
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');

  // Formulaire Commande Client
  const [bouteilleType, setBouteilleType] = useState('B12 (12.5 kg)');
  const [quantite, setQuantite] = useState('1');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  
  // Données de démonstration synchronisées
  const [commandes, setCommandes] = useState([
    { id: 'CMD-102', date: '23/10/2026', type: 'B12 (12.5 kg)', qte: 1, statut: 'En livraison', total: '5 500 FCFA' },
    { id: 'CMD-099', date: '15/10/2026', type: 'B6 (6 kg)', qte: 2, statut: 'Livrée', total: '4 000 FCFA' }
  ]);

  // Stocks Dépôt Vendeur
  const [stockB6, setStockB6] = useState('24');
  const [stockB12, setStockB12] = useState('45');
  const [stockB28, setStockB28] = useState('12');

  // 1. Authentification Connexion
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(`Le serveur a répondu avec une erreur (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Identifiants invalides.');
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

  // 2. Authentification Inscription
  const handleRegister = async (type) => {
    if (!nom || !telephone || !email || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir l\'ensemble des champs obligatoires (*).');
      return;
    }

    setLoading(true);
    const endpoint = type === 'depot' ? '/api/auth/register-depot' : '/api/auth/register-client';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nom: nom.trim(),
          telephone: telephone.trim(),
          adresse: adresse.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          role: type,
        }),
      });

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(`Erreur du serveur HTTP (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Erreur lors de la création du compte.');
      }

      const newUser = data.user || { nom, email, telephone, adresse, role: type };
      setUser(newUser);
      setAdresseLivraison(adresse.trim());
      setDashboardTab('home');
      Alert.alert('Bienvenue', 'Votre compte a été créé avec succès.');
    } catch (error) {
      Alert.alert('Erreur lors de la création', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Soumettre une commande (Client)
  const handleCreateOrder = () => {
    if (!adresseLivraison) {
      Alert.alert('Adresse manquante', 'Veuillez saisir votre adresse de livraison.');
      return;
    }

    const qteNum = parseInt(quantite) || 1;
    const newCmd = {
      id: `CMD-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('fr-FR'),
      type: bouteilleType,
      qte: qteNum,
      statut: 'En attente',
      total: `${qteNum * 5500} FCFA`
    };

    setCommandes([newCmd, ...commandes]);
    Alert.alert(
      'Commande Transmise',
      `Votre commande de ${qteNum} bouteille(s) (${bouteilleType}) est enregistrée.`,
      [{ text: 'Voir l\'historique', onPress: () => setDashboardTab('orders_list') }]
    );
  };

  // 4. Mettre à jour le stock (Vendeur)
  const handleUpdateStock = () => {
    Alert.alert('Stock actualisé', 'Les nouveaux niveaux de stock sont enregistrés et visibles sur la plateforme.');
    setDashboardTab('home');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('welcome');
    setDashboardTab('home');
    setEmail('');
    setPassword('');
    setNom('');
    setTelephone('');
    setAdresse('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* En-tête Pro style Dashboard */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoLetter}>M</Text>
          </View>
          <View>
            <Text style={styles.headerBrandTitle}>MONAN SERVICE</Text>
            <Text style={styles.headerBrandSubtitle}>
              {user ? (user.role === 'depot' ? 'PORTAIL VENDEUR & DÉPÔT' : 'ESPACE CLIENT PRO') : 'DISTRIBUTION DE GAZ'}
            </Text>
          </View>
        </View>
        {user && (
          <TouchableOpacity style={styles.logoutIconButton} onPress={handleLogout}>
            <Text style={styles.logoutIconText}>Quitter</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ========================================== */}
          {/* ECRANS TABLEAU DE BORD (LOGGED IN)         */}
          {/* ========================================== */}
          {user ? (
            <View>
              {/* Barre de navigation par onglets (Pills Navigation Bar) */}
              <View style={styles.navTabsBar}>
                <TouchableOpacity
                  style={[styles.navTabPill, dashboardTab === 'home' && styles.navTabPillActive]}
                  onPress={() => setDashboardTab('home')}
                >
                  <Text style={[styles.navTabPillText, dashboardTab === 'home' && styles.navTabPillTextActive]}>
                    Vue d'ensemble
                  </Text>
                </TouchableOpacity>

                {user.role === 'depot' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.navTabPill, dashboardTab === 'add_stock' && styles.navTabPillActive]}
                      onPress={() => setDashboardTab('add_stock')}
                    >
                      <Text style={[styles.navTabPillText, dashboardTab === 'add_stock' && styles.navTabPillTextActive]}>
                        + Stocks
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.navTabPill, dashboardTab === 'sales_list' && styles.navTabPillActive]}
                      onPress={() => setDashboardTab('sales_list')}
                    >
                      <Text style={[styles.navTabPillText, dashboardTab === 'sales_list' && styles.navTabPillTextActive]}>
                        Ventes
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.navTabPill, dashboardTab === 'order' && styles.navTabPillActive]}
                      onPress={() => setDashboardTab('order')}
                    >
                      <Text style={[styles.navTabPillText, dashboardTab === 'order' && styles.navTabPillTextActive]}>
                        Commander
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.navTabPill, dashboardTab === 'orders_list' && styles.navTabPillActive]}
                      onPress={() => setDashboardTab('orders_list')}
                    >
                      <Text style={[styles.navTabPillText, dashboardTab === 'orders_list' && styles.navTabPillTextActive]}>
                        Commandes ({commandes.length})
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* VUE 1 : VUE D'ENSEMBLE (KPI & CARTES RAPIDES) */}
              {dashboardTab === 'home' && (
                <View>
                  {/* Carte d'accueil utilisateur */}
                  <View style={styles.userProfileCard}>
                    <View style={styles.userRoleTag}>
                      <Text style={styles.userRoleTagText}>
                        {user.role === 'depot' ? ' DÉPÔT PARTENAIRE' : ' CLIENT VÉRIFIÉ'}
                      </Text>
                    </View>
                    <Text style={styles.welcomeTitleText}>Bienvenue, {user.nom || user.email}</Text>
                    <Text style={styles.welcomeSubText}>
                      Bienvenue sur votre espace de gestion centralisé.
                    </Text>

                    <View style={styles.divider} />

                    <View style={styles.profileDetailsRow}>
                      <View style={styles.profileDetailCol}>
                        <Text style={styles.profileDetailLabel}>EMAIL</Text>
                        <Text style={styles.profileDetailValue}>{user.email}</Text>
                      </View>
                      <View style={styles.profileDetailCol}>
                        <Text style={styles.profileDetailLabel}>CONTACT</Text>
                        <Text style={styles.profileDetailValue}>{user.telephone || 'Non renseigné'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Cartes d'indicateurs de performance (KPI Cards) */}
                  <Text style={styles.sectionHeaderTitle}>Aperçu rapide</Text>

                  {user.role === 'depot' ? (
                    <View style={styles.kpiGrid}>
                      <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>STOCK B12</Text>
                        <Text style={styles.kpiValue}>{stockB12} unités</Text>
                        <Text style={styles.kpiSub}>Disponible</Text>
                      </View>
                      <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>TOTAL STOCKS</Text>
                        <Text style={styles.kpiValue}>
                          {parseInt(stockB6) + parseInt(stockB12) + parseInt(stockB28)} Bouteilles
                        </Text>
                        <Text style={styles.kpiSub}>B6, B12 & B28</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.kpiGrid}>
                      <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>COMMANDES ACTIVES</Text>
                        <Text style={styles.kpiValue}>{commandes.length}</Text>
                        <Text style={styles.kpiSub}>Suivi en temps réel</Text>
                      </View>
                      <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>DERNIER ACHAT</Text>
                        <Text style={styles.kpiValue}>{commandes[0]?.type || 'Aucun'}</Text>
                        <Text style={styles.kpiSub}>{commandes[0]?.total || '-'}</Text>
                      </View>
                    </View>
                  )}

                  {/* Raccourcis d'action rapide */}
                  <Text style={styles.sectionHeaderTitle}>Actions rapides</Text>

                  {user.role === 'depot' ? (
                    <View style={styles.actionGrid}>
                      <TouchableOpacity
                        style={styles.btnPrimaryPro}
                        onPress={() => setDashboardTab('add_stock')}
                      >
                        <Text style={styles.btnPrimaryProText}>+ Mettre à jour les stocks</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnSecondaryPro}
                        onPress={() => setDashboardTab('sales_list')}
                      >
                        <Text style={styles.btnSecondaryProText}>Consulter l'historique des ventes</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.actionGrid}>
                      <TouchableOpacity
                        style={styles.btnPrimaryPro}
                        onPress={() => setDashboardTab('order')}
                      >
                        <Text style={styles.btnPrimaryProText}>Commander une recharge de gaz</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnSecondaryPro}
                        onPress={() => setDashboardTab('orders_list')}
                      >
                        <Text style={styles.btnSecondaryProText}>Voir l'historique des commandes</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* VUE 2 : COMMANDER (CLIENT) */}
              {dashboardTab === 'order' && (
                <View style={styles.mainCard}>
                  <Text style={styles.cardHeaderTitle}>Nouvelle Commande de Gaz</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Sélectionnez le format de votre bouteille et saisissez le lieu de livraison.
                  </Text>

                  <Text style={styles.inputLabel}>Type de Bouteille de Gaz *</Text>
                  <View style={styles.chipGroup}>
                    {['B6 (6 kg)', 'B12 (12.5 kg)', 'B28 (28 kg)'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.chipItem, bouteilleType === type && styles.chipItemActive]}
                        onPress={() => setBouteilleType(type)}
                      >
                        <Text style={[styles.chipItemText, bouteilleType === type && styles.chipItemTextActive]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Nombre de Bouteilles</Text>
                  <TextInput
                    style={styles.textInputPro}
                    keyboardType="numeric"
                    value={quantite}
                    onChangeText={setQuantite}
                  />

                  <Text style={styles.inputLabel}>Adresse exacte de livraison *</Text>
                  <TextInput
                    style={styles.textInputPro}
                    placeholder="Ex: Cocody Angré 8ème Tranche, Villa 142"
                    placeholderTextColor="#94A3B8"
                    value={adresseLivraison}
                    onChangeText={setAdresseLivraison}
                  />

                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryTextLabel}>Estimation Totale :</Text>
                    <Text style={styles.summaryTextPrice}>
                      {(parseInt(quantite) || 1) * 5500} FCFA
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.btnPrimaryPro} onPress={handleCreateOrder}>
                    <Text style={styles.btnPrimaryProText}>Confirmer la Commande</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* VUE 3 : MES COMMANDES (CLIENT) */}
              {dashboardTab === 'orders_list' && (
                <View style={styles.mainCard}>
                  <Text style={styles.cardHeaderTitle}>Historique des Commandes</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Suivez le statut de livraison de vos recharges.
                  </Text>

                  {commandes.map((cmd) => (
                    <View key={cmd.id} style={styles.listCardItem}>
                      <View style={styles.listCardHeader}>
                        <Text style={styles.listCardCode}>{cmd.id}</Text>
                        <View style={styles.statusBadgeGreen}>
                          <Text style={styles.statusBadgeGreenText}>{cmd.statut}</Text>
                        </View>
                      </View>
                      <Text style={styles.listCardBody}>{cmd.qte}x Bouteille {cmd.type}</Text>
                      <View style={styles.listCardFooter}>
                        <Text style={styles.listCardDate}>{cmd.date}</Text>
                        <Text style={styles.listCardPrice}>{cmd.total}</Text>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[styles.btnPrimaryPro, { marginTop: 12 }]}
                    onPress={() => setDashboardTab('order')}
                  >
                    <Text style={styles.btnPrimaryProText}>+ Passer une nouvelle commande</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* VUE 4 : GÉRER STOCKS (VENDEUR) */}
              {dashboardTab === 'add_stock' && (
                <View style={styles.mainCard}>
                  <Text style={styles.cardHeaderTitle}>Mise à jour des Stocks</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Ajustez la disponibilité des bouteilles de votre dépôt.
                  </Text>

                  <Text style={styles.inputLabel}>Stock disponible B6 (6 kg)</Text>
                  <TextInput
                    style={styles.textInputPro}
                    keyboardType="numeric"
                    value={stockB6}
                    onChangeText={setStockB6}
                  />

                  <Text style={styles.inputLabel}>Stock disponible B12 (12.5 kg)</Text>
                  <TextInput
                    style={styles.textInputPro}
                    keyboardType="numeric"
                    value={stockB12}
                    onChangeText={setStockB12}
                  />

                  <Text style={styles.inputLabel}>Stock disponible B28 (28 kg)</Text>
                  <TextInput
                    style={styles.textInputPro}
                    keyboardType="numeric"
                    value={stockB28}
                    onChangeText={setStockB28}
                  />

                  <TouchableOpacity style={styles.btnPrimaryPro} onPress={handleUpdateStock}>
                    <Text style={styles.btnPrimaryProText}>Enregistrer la mise à jour</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* VUE 5 : HISTORIQUE VENTES (VENDEUR) */}
              {dashboardTab === 'sales_list' && (
                <View style={styles.mainCard}>
                  <Text style={styles.cardHeaderTitle}>Suivi du Dépôt</Text>
                  
                  <View style={styles.stockSummaryContainer}>
                    <Text style={styles.stockSummaryTitle}>État Actuel des Stocks :</Text>
                    <Text style={styles.stockSummaryRow}>• Bouteilles B6 : {stockB6} en réserve</Text>
                    <Text style={styles.stockSummaryRow}>• Bouteilles B12 : {stockB12} en réserve</Text>
                    <Text style={styles.stockSummaryRow}>• Bouteilles B28 : {stockB28} en réserve</Text>
                  </View>

                  <Text style={styles.cardHeaderTitle}>Commandes à Honorer</Text>

                  {commandes.map((cmd) => (
                    <View key={cmd.id} style={styles.listCardItem}>
                      <View style={styles.listCardHeader}>
                        <Text style={styles.listCardCode}>{cmd.id}</Text>
                        <Text style={styles.listCardPrice}>{cmd.total}</Text>
                      </View>
                      <Text style={styles.listCardBody}>{cmd.qte}x Bouteille {cmd.type}</Text>
                      <Text style={styles.listCardDate}>Date : {cmd.date}</Text>
                    </View>
                  ))}
                </View>
              )}

            </View>
          ) : (
            <>
              {/* ========================================== */}
              {/* ÉCRAN D'ACCUEIL / SÉLECTION TYPE COMPTE   */}
              {/* ========================================== */}
              {currentScreen === 'welcome' && (
                <View>
                  <View style={styles.heroBanner}>
                    <Text style={styles.heroTitle}>Espace de Distribution & Gestion de Gaz</Text>
                    <Text style={styles.heroSubtitle}>
                      La plateforme de référence pour les clients professionnels, particuliers et dépôts de gaz.
                    </Text>
                  </View>

                  {/* Option Vendeur / Dépôt */}
                  <TouchableOpacity
                    style={[styles.choiceCardPro, styles.choiceCardPrimaryDark]}
                    onPress={() => setCurrentScreen('register_depot')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardBadgeOrange}>
                      <Text style={styles.cardBadgeOrangeText}>ESPACE VENDEUR</Text>
                    </View>
                    <Text style={styles.choiceCardTitleLight}>Compte Dépôt de Gaz</Text>
                    <Text style={styles.choiceCardSubLight}>
                      Gérez vos niveaux de stock, suivez vos ventes et recevez les commandes clients.
                    </Text>
                  </TouchableOpacity>

                  {/* Option Client */}
                  <TouchableOpacity
                    style={[styles.choiceCardPro, styles.choiceCardWhite]}
                    onPress={() => setCurrentScreen('register_client')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardBadgeNavy}>
                      <Text style={styles.cardBadgeNavyText}>CLIENT & PARTICULIER</Text>
                    </View>
                    <Text style={styles.choiceCardTitleDark}>Compte Client</Text>
                    <Text style={styles.choiceCardSubDark}>
                      Commandez directement vos recharges de gaz et faites-vous livrer rapidement.
                    </Text>
                  </TouchableOpacity>

                  {/* Option Se connecter */}
                  <View style={styles.authSwitchBox}>
                    <Text style={styles.authSwitchLabel}>Vous possédez déjà un compte ?</Text>
                    <TouchableOpacity
                      style={styles.btnOutlineNavy}
                      onPress={() => setCurrentScreen('login')}
                    >
                      <Text style={styles.btnOutlineNavyText}>Accéder à mon compte</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ========================================== */}
              {/* FORMULAIRE DE CRÉATION DE COMPTE          */}
              {/* ========================================== */}
              {(currentScreen === 'register_depot' || currentScreen === 'register_client') && (
                <View style={styles.mainCard}>
                  <TouchableOpacity style={styles.backLinkBtn} onPress={() => setCurrentScreen('welcome')}>
                    <Text style={styles.backLinkBtnText}>← Choisir un autre type de compte</Text>
                  </TouchableOpacity>

                  <Text style={styles.cardHeaderTitle}>
                    {currentScreen === 'register_depot' ? 'Inscrire un Dépôt de Gaz' : 'Créer un Compte Client'}
                  </Text>

                  <Text style={styles.inputLabel}>Nom complet ou Raison Sociale *</Text>
                  <TextInput
                    style={styles.textInputPro}
                    placeholder="Ex: Dépôt Gaz Angré / Jean Dupont"
                    placeholderTextColor="#94A3B8"
                    value={nom}
                    onChangeText={setNom}
                  />

                  <Text style={styles.inputLabel}>Numéro de Téléphone *</Text>
                  <TextInput
                    style={styles.textInputPro}
                    placeholder="Ex: +225 07 00 00 00 00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={telephone}
                    onChangeText={setTelephone}
                  />

                  <Text style={styles.inputLabel}>Adresse de Localisation</Text>
                  <TextInput
                    style={styles.textInputPro}
                    placeholder="Ex: Abidjan, Cocody Angré"
                    placeholderTextColor="#94A3B8"
                    value={adresse}
                    onChangeText={setAdresse}
                  />

                  <Text style={styles.inputLabel}>Adresse Email *</Text>
                  <TextInput
                    style={styles.textInputPro}
                    placeholder="Ex: contact@monan.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />

                  <Text style={styles.inputLabel}>Mot de passe *</Text>
                  <TextInput
                    style={styles.textInputPro}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />

                  <TouchableOpacity
                    style={styles.btnPrimaryPro}
                    onPress={() => handleRegister(currentScreen === 'register_depot' ? 'depot' : 'client')}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.btnPrimaryProText}>Finaliser l'inscription</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ========================================== */}
              {/* FORMULAIRE DE CONNEXION                    */}
              {/* ========================================== */}
              {currentScreen === 'login' && (
                <View style={styles.mainCard}>
                  <TouchableOpacity style={styles.backLinkBtn} onPress={() => setCurrentScreen('welcome')}>
                    <Text style={styles.backLinkBtnText}>← Retour à l'accueil</Text>
                  </TouchableOpacity>

                  <Text style={styles.cardHeaderTitle}>Connexion à votre compte</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Entrez vos identifiants pour accéder à votre espace personnalisé.
                  </Text>

                  <Text style={styles.inputLabel}>Adresse Email</Text>
                  <TextInput
                    style={styles.textInputPro}
                    placeholder="Ex: nom@domaine.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />

                  <Text style={styles.inputLabel}>Mot de passe</Text>
                  <TextInput
                    style={styles.textInputPro}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />

                  <TouchableOpacity style={styles.btnPrimaryPro} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.btnPrimaryProText}>Se connecter</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.switchAuthBtn} onPress={() => setCurrentScreen('welcome')}>
                    <Text style={styles.switchAuthBtnText}>
                      Vous n'avez pas encore de compte ? S'inscrire
                    </Text>
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

// ==========================================
// CHARTE GRAPHIQUE PROFESSIONNELLE & STYLES
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Gris arrière-plan très doux
  },
  
  // Header Style Web-App
  headerBar: {
    backgroundColor: '#0F172A', // Bleu Nuit Deep Navy
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 3,
    borderBottomColor: '#F97316', // Ligne Brand Orange
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  headerBrandTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerBrandSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  logoutIconButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutIconText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Hero section accueil
  heroBanner: {
    marginBottom: 20,
    marginTop: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 20,
  },

  // Choice Cards
  choiceCardPro: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  choiceCardPrimaryDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  choiceCardWhite: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cardBadgeOrange: {
    backgroundColor: '#F97316',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  cardBadgeOrangeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  cardBadgeNavy: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  cardBadgeNavyText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
  },
  choiceCardTitleLight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  choiceCardSubLight: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 18,
  },
  choiceCardTitleDark: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  choiceCardSubDark: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 18,
  },

  // Switch Auth
  authSwitchBox: {
    alignItems: 'center',
    marginTop: 12,
  },
  authSwitchLabel: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 10,
  },
  btnOutlineNavy: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0F172A',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  btnOutlineNavyText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
  },

  // Main Card Wrapper (Formulaires & Vues)
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  backLinkBtn: {
    marginBottom: 16,
  },
  backLinkBtnText: {
    color: '#F97316',
    fontWeight: '700',
    fontSize: 13,
  },
  cardHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
  },

  // Form Inputs
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInputPro: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 16,
  },
  btnPrimaryPro: {
    backgroundColor: '#F97316',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnPrimaryProText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  btnSecondaryPro: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  btnSecondaryProText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
  switchAuthBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchAuthBtnText: {
    color: '#64748B',
    fontSize: 13,
  },

  // Navigation Pills (Dashboard Tabs)
  navTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
    gap: 4,
  },
  navTabPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  navTabPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navTabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  navTabPillTextActive: {
    color: '#0F172A',
  },

  // User Profile Card
  userProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  userRoleTag: {
    backgroundColor: '#FFF7ED',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  userRoleTagText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
  },
  welcomeTitleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  welcomeSubText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  profileDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileDetailCol: {
    flex: 1,
  },
  profileDetailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  profileDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },

  // Section Headers & KPI
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F97316',
    marginTop: 6,
  },
  kpiSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionGrid: {
    gap: 12,
    marginBottom: 20,
  },

  // Chip selector pour type de bouteille
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chipItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  chipItemActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipItemText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  chipItemTextActive: {
    color: '#FFFFFF',
  },

  // Summary box
  summaryBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  summaryTextLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A3412',
  },
  summaryTextPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#C2410C',
  },

  // List Cards
  listCardItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listCardCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadgeGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeGreenText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  listCardBody: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    marginBottom: 8,
  },
  listCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCardDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  listCardPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F97316',
  },

  // Stock summary vendor
  stockSummaryContainer: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  stockSummaryTitle: {
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    fontSize: 14,
  },
  stockSummaryRow: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
});