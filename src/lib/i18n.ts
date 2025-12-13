/**
 * i18n Configuration
 * 
 * Internationalization setup for EN/FR bilingual support.
 * Addresses Gap #3: Bilingual EN/FR (HIGH Priority)
 * 
 * Note: This is a lightweight i18n implementation that doesn't require
 * additional npm packages. For production, consider using react-i18next.
 */

import { createContext, useContext } from 'react';

// Supported languages
export type Language = 'en' | 'fr';

// Translation keys structure
export interface Translations {
  // Navigation
  nav: {
    home: string;
    dashboard: string;
    indigenous: string;
    climate: string;
    about: string;
    contact: string;
    pricing: string;
    profile: string;
    settings: string;
    signIn: string;
    signOut: string;
    docs: string;
  };
  // Common UI elements
  common: {
    loading: string;
    error: string;
    retry: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    download: string;
    export: string;
    search: string;
    filter: string;
    clear: string;
    selectAll: string;
    noData: string;
    lastUpdated: string;
    source: string;
    viewSource: string;
  };
  // Dashboard sections
  dashboard: {
    title: string;
    subtitle: string;
    demand: string;
    price: string;
    generation: string;
    emissions: string;
    renewable: string;
    storage: string;
    realTime: string;
    historical: string;
  };
  // Indigenous module
  indigenous: {
    title: string;
    subtitle: string;
    sovereignty: string;
    consultation: string;
    fpic: string;
    tek: string;
    governance: string;
    territory: string;
    community: string;
    project: string;
    consentNotice: string;
  };
  // Accessibility
  a11y: {
    skipToMain: string;
    closeDialog: string;
    openMenu: string;
    expandSection: string;
    collapseSection: string;
  };
  // Data sources
  dataSources: {
    ieso: string;
    aeso: string;
    eccc: string;
    cer: string;
    nrcan: string;
  };
  // Dashboard tabs
  tabs: {
    home: string;
    realTime: string;
    analytics: string;
    indigenous: string;
    climatePolicy: string;
    aiDataCentre: string;
    resilience: string;
    esgFinance: string;
    gridOptimization: string;
    security: string;
  };
  // Charts and KPIs
  charts: {
    ontarioDemand: string;
    albertaSupplyDemand: string;
    generationMix: string;
    weatherCorrelation: string;
    priceHistory: string;
    emissionsTrend: string;
    renewablePenetration: string;
  };
  // KPI labels
  kpi: {
    currentDemand: string;
    peakDemand: string;
    currentPrice: string;
    avgPrice: string;
    totalGeneration: string;
    renewableShare: string;
    carbonIntensity: string;
    gridFrequency: string;
  };
  // Home page
  home: {
    heroTitle: string;
    heroSubtitle: string;
    ctaExploreDashboard: string;
    ctaViewAnalytics: string;
  };
  // Employers landing page
  employers: {
    badgeLabel: string;
    heroTitle: string;
    heroSubtitle: string;
    ctaContactSales: string;
    ctaViewTracks: string;
    sectionWhyPartner: string;
    sectionCapabilityProfiles: string;
    sectionCapabilitySubtitle: string;
    sectionReadyTitle: string;
    sectionReadySubtitle: string;
    ctaScheduleDemo: string;
    ctaApiIntegration: string;
    linkBackToDashboard: string;
    linkForIncubators: string;
  };
  // Incubators / CTN landing page
  incubators: {
    badgeLabel: string;
    heroTitle: string;
    heroSubtitle: string;
    ctaCalculator: string;
    ctaCohortDemo: string;
    sectionWhyChoose: string;
    metricBadgeLabel: string;
    sectionCalculatorTitle: string;
    sectionCalculatorSubtitle: string;
    sectionInputsTitle: string;
    sectionMetricsTitle: string;
    sectionPriorityTitle: string;
    sectionPriorityBody: string;
    sectionTracksTitle: string;
    sectionReadyTitle: string;
    sectionReadySubtitle: string;
    ctaContactPartnerships: string;
    ctaApiDocs: string;
    linkForEmployers: string;
    linkBackToDashboard: string;
  };
}

// English translations
export const en: Translations = {
  nav: {
    home: 'Home',
    dashboard: 'Dashboard',
    indigenous: 'Indigenous Energy',
    climate: 'Climate Policy',
    about: 'About',
    contact: 'Contact',
    pricing: 'Pricing',
    profile: 'Profile',
    settings: 'Settings',
    signIn: 'Get Started',
    signOut: 'Sign Out',
    docs: 'Documentation'
  },
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    download: 'Download',
    export: 'Export',
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    selectAll: 'Select All',
    noData: 'No data available',
    lastUpdated: 'Last updated',
    source: 'Source',
    viewSource: 'View source'
  },
  dashboard: {
    title: 'Canada Energy Intelligence Platform',
    subtitle: 'Real-time energy data analytics and insights',
    demand: 'Demand',
    price: 'Price',
    generation: 'Generation',
    emissions: 'Emissions',
    renewable: 'Renewable',
    storage: 'Storage',
    realTime: 'Real-time',
    historical: 'Historical'
  },
  indigenous: {
    title: 'Indigenous Energy Sovereignty',
    subtitle: 'Consultation tracking and traditional knowledge',
    sovereignty: 'Sovereignty',
    consultation: 'Consultation',
    fpic: 'Free, Prior and Informed Consent',
    tek: 'Traditional Ecological Knowledge',
    governance: 'Governance',
    territory: 'Territory',
    community: 'Community',
    project: 'Project',
    consentNotice: 'This dashboard uses placeholder data. Real Indigenous data integration requires formal governance agreements and FPIC from affected communities.'
  },
  a11y: {
    skipToMain: 'Skip to main content',
    closeDialog: 'Close dialog',
    openMenu: 'Open menu',
    expandSection: 'Expand section',
    collapseSection: 'Collapse section'
  },
  dataSources: {
    ieso: 'Independent Electricity System Operator',
    aeso: 'Alberta Electric System Operator',
    eccc: 'Environment and Climate Change Canada',
    cer: 'Canada Energy Regulator',
    nrcan: 'Natural Resources Canada'
  },
  tabs: {
    home: 'Home',
    realTime: 'Real-Time',
    analytics: 'Analytics & Trends',
    indigenous: 'Indigenous Energy',
    climatePolicy: 'Climate Policy',
    aiDataCentre: 'AI Data Centres',
    resilience: 'Resilience',
    esgFinance: 'ESG & Finance',
    gridOptimization: 'Grid Optimization',
    security: 'Security'
  },
  charts: {
    ontarioDemand: 'Ontario Hourly Demand',
    albertaSupplyDemand: 'Alberta Supply & Demand',
    generationMix: 'Provincial Generation Mix',
    weatherCorrelation: 'Weather Correlation',
    priceHistory: 'Price History',
    emissionsTrend: 'Emissions Trend',
    renewablePenetration: 'Renewable Penetration'
  },
  kpi: {
    currentDemand: 'Current Demand',
    peakDemand: 'Peak Demand',
    currentPrice: 'Current Price',
    avgPrice: 'Average Price',
    totalGeneration: 'Total Generation',
    renewableShare: 'Renewable Share',
    carbonIntensity: 'Carbon Intensity',
    gridFrequency: 'Grid Frequency'
  },
  home: {
    heroTitle: 'Canada Energy Intelligence Platform',
    heroSubtitle: 'Real-time monitoring and AI-powered insights for Canadian energy infrastructure.',
    ctaExploreDashboard: 'Explore Dashboard',
    ctaViewAnalytics: 'View Analytics'
  },
  employers: {
    badgeLabel: 'For Employers',
    heroTitle: 'Build Your Energy Transition Team',
    heroSubtitle:
      'Access pre-qualified energy professionals with verified credentials in grid analytics, decarbonization, Indigenous consultation, and renewable integration.',
    ctaContactSales: 'Contact Sales',
    ctaViewTracks: 'View Certification Tracks',
    sectionWhyPartner: 'Why Partner With CEIP?',
    sectionCapabilityProfiles: 'Capability Profiles',
    sectionCapabilitySubtitle:
      'Download LMIA-ready role profiles with NOC codes and salary benchmarks',
    sectionReadyTitle: 'Ready to Build Your Team?',
    sectionReadySubtitle:
      'Get access to our talent pool, custom recruitment support, and LMIA documentation assistance. Enterprise pricing available for organizations hiring 5+ roles.',
    ctaScheduleDemo: 'Schedule a Demo',
    ctaApiIntegration: 'API Integration',
    linkBackToDashboard: '← Back to Dashboard',
    linkForIncubators: 'For Incubators & CTNs →'
  },
  incubators: {
    badgeLabel: 'For Incubators & CTNs',
    heroTitle: 'Accelerate Your Energy Tech Program',
    heroSubtitle:
      'Partner with CEIP to deliver credentialed training programs with measurable economic outcomes. Qualify for priority processing and demonstrate significant economic benefit.',
    ctaCalculator: 'Calculate Economic Impact',
    ctaCohortDemo: 'Cohort Admin Demo',
    sectionWhyChoose: 'Why Incubators Choose CEIP',
    metricBadgeLabel: 'DIA-SOURCE Metric Calculator',
    sectionCalculatorTitle: 'Calculate Your Economic Benefit',
    sectionCalculatorSubtitle:
      'Estimate the economic impact of your training program to demonstrate eligibility for priority processing under the Dedicated Immigration Authority framework.',
    sectionInputsTitle: 'Program Inputs',
    sectionMetricsTitle: 'Economic Impact Metrics',
    sectionPriorityTitle: 'Priority Processing Eligible',
    sectionPriorityBody:
      'Based on these metrics, this program may qualify for DIA-SOURCE priority processing due to demonstrated significant economic benefit.',
    sectionTracksTitle: 'Available Training Tracks',
    sectionReadyTitle: 'Ready to Launch Your Energy Training Program?',
    sectionReadySubtitle:
      'Get access to our curriculum, cohort management tools, and economic impact reporting. White-label solutions available for established incubators.',
    ctaContactPartnerships: 'Contact Partnerships',
    ctaApiDocs: 'API Documentation',
    linkForEmployers: '← For Employers',
    linkBackToDashboard: 'Back to Dashboard →'
  }
};

// French translations
export const fr: Translations = {
  nav: {
    home: 'Accueil',
    dashboard: 'Tableau de bord',
    indigenous: 'Énergie autochtone',
    climate: 'Politique climatique',
    about: 'À propos',
    contact: 'Contact',
    pricing: 'Tarification',
    profile: 'Profil',
    settings: 'Paramètres',
    signIn: 'Connexion',
    signOut: 'Déconnexion',
    docs: 'Documentation'
  },
  common: {
    loading: 'Chargement...',
    error: 'Une erreur est survenue',
    retry: 'Réessayer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    view: 'Voir',
    download: 'Télécharger',
    export: 'Exporter',
    search: 'Rechercher',
    filter: 'Filtrer',
    clear: 'Effacer',
    selectAll: 'Tout sélectionner',
    noData: 'Aucune donnée disponible',
    lastUpdated: 'Dernière mise à jour',
    source: 'Source',
    viewSource: 'Voir la source'
  },
  dashboard: {
    title: 'Plateforme canadienne de renseignements énergétiques',
    subtitle: 'Analyses et perspectives énergétiques en temps réel',
    demand: 'Demande',
    price: 'Prix',
    generation: 'Production',
    emissions: 'Émissions',
    renewable: 'Renouvelable',
    storage: 'Stockage',
    realTime: 'Temps réel',
    historical: 'Historique'
  },
  indigenous: {
    title: 'Souveraineté énergétique autochtone',
    subtitle: 'Suivi des consultations et connaissances traditionnelles',
    sovereignty: 'Souveraineté',
    consultation: 'Consultation',
    fpic: 'Consentement libre, préalable et éclairé',
    tek: 'Savoir écologique traditionnel',
    governance: 'Gouvernance',
    territory: 'Territoire',
    community: 'Communauté',
    project: 'Projet',
    consentNotice: 'Ce tableau de bord utilise des données fictives. L\'intégration de données autochtones réelles nécessite des accords de gouvernance formels et le CLPE des communautés concernées.'
  },
  a11y: {
    skipToMain: 'Passer au contenu principal',
    closeDialog: 'Fermer la boîte de dialogue',
    openMenu: 'Ouvrir le menu',
    expandSection: 'Développer la section',
    collapseSection: 'Réduire la section'
  },
  dataSources: {
    ieso: 'Société indépendante d\'exploitation du réseau d\'électricité',
    aeso: 'Alberta Electric System Operator',
    eccc: 'Environnement et Changement climatique Canada',
    cer: 'Régie de l\'énergie du Canada',
    nrcan: 'Ressources naturelles Canada'
  },
  tabs: {
    home: 'Accueil',
    realTime: 'Temps réel',
    analytics: 'Analyses et tendances',
    indigenous: 'Énergie autochtone',
    climatePolicy: 'Politique climatique',
    aiDataCentre: 'Centres de données IA',
    resilience: 'Résilience',
    esgFinance: 'ESG et finance',
    gridOptimization: 'Optimisation du réseau',
    security: 'Sécurité'
  },
  charts: {
    ontarioDemand: 'Demande horaire de l\'Ontario',
    albertaSupplyDemand: 'Offre et demande de l\'Alberta',
    generationMix: 'Mix de production provincial',
    weatherCorrelation: 'Corrélation météorologique',
    priceHistory: 'Historique des prix',
    emissionsTrend: 'Tendance des émissions',
    renewablePenetration: 'Pénétration des énergies renouvelables'
  },
  kpi: {
    currentDemand: 'Demande actuelle',
    peakDemand: 'Demande de pointe',
    currentPrice: 'Prix actuel',
    avgPrice: 'Prix moyen',
    totalGeneration: 'Production totale',
    renewableShare: 'Part renouvelable',
    carbonIntensity: 'Intensité carbone',
    gridFrequency: 'Fréquence du réseau'
  },
  home: {
    heroTitle: 'Plateforme canadienne de renseignements énergétiques',
    heroSubtitle:
      'Surveillance en temps réel et perspectives alimentées par l\'IA pour les infrastructures énergétiques canadiennes.',
    ctaExploreDashboard: 'Explorer le tableau de bord',
    ctaViewAnalytics: 'Voir les analyses'
  },
  employers: {
    badgeLabel: 'Pour les employeurs',
    heroTitle: 'Constituez votre équipe pour la transition énergétique',
    heroSubtitle:
      'Accédez à des professionnels présélectionnés avec des compétences vérifiées en analytique de réseau, décarbonation, consultation autochtone et intégration des énergies renouvelables.',
    ctaContactSales: 'Contacter l\'équipe commerciale',
    ctaViewTracks: 'Voir les parcours de certification',
    sectionWhyPartner: 'Pourquoi collaborer avec la CEIP ?',
    sectionCapabilityProfiles: 'Profils de compétences',
    sectionCapabilitySubtitle:
      'Téléchargez des profils de poste prêts pour l\'EIMT avec codes CNP et fourchettes salariales',
    sectionReadyTitle: 'Prêt à constituer votre équipe ?',
    sectionReadySubtitle:
      'Accédez à notre vivier de talents, à un soutien personnalisé au recrutement et à l\'assistance pour la documentation liée à l\'EIMT. Tarification entreprise disponible pour les organisations recrutant 5 postes ou plus.',
    ctaScheduleDemo: 'Planifier une démonstration',
    ctaApiIntegration: 'Intégration API',
    linkBackToDashboard: '← Retour au tableau de bord',
    linkForIncubators: 'Pour les incubateurs et CTN →'
  },
  incubators: {
    badgeLabel: 'Pour les incubateurs et CTN',
    heroTitle: 'Accélérez votre programme de technologies énergétiques',
    heroSubtitle:
      'Collaborez avec la CEIP pour offrir des programmes de formation certifiés avec des résultats économiques mesurables. Devenez admissible au traitement prioritaire et démontrez un bénéfice économique significatif.',
    ctaCalculator: 'Calculer l\'impact économique',
    ctaCohortDemo: 'Démo de l\'administration des cohortes',
    sectionWhyChoose: 'Pourquoi les incubateurs choisissent la CEIP',
    metricBadgeLabel: 'Calculateur de métriques DIA-SOURCE',
    sectionCalculatorTitle: 'Calculez votre bénéfice économique',
    sectionCalculatorSubtitle:
      'Estimez l\'impact économique de votre programme de formation afin de démontrer votre admissibilité au traitement prioritaire dans le cadre de l\'autorité dédiée en immigration.',
    sectionInputsTitle: 'Paramètres du programme',
    sectionMetricsTitle: 'Métriques d\'impact économique',
    sectionPriorityTitle: 'Admissible au traitement prioritaire',
    sectionPriorityBody:
      'Selon ces métriques, ce programme peut être admissible au traitement prioritaire DIA-SOURCE en raison du bénéfice économique significatif démontré.',
    sectionTracksTitle: 'Parcours de formation disponibles',
    sectionReadyTitle: 'Prêt à lancer votre programme de formation énergétique ?',
    sectionReadySubtitle:
      'Accédez à notre programme d\'études, aux outils de gestion des cohortes et aux rapports d\'impact économique. Solutions en marque blanche disponibles pour les incubateurs établis.',
    ctaContactPartnerships: 'Contacter les partenariats',
    ctaApiDocs: 'Documentation API',
    linkForEmployers: '← Pour les employeurs',
    linkBackToDashboard: 'Retour au tableau de bord →'
  }
};

// All translations
export const translations: Record<Language, Translations> = { en, fr };

// i18n Context
export interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: en
});

// Hook to use translations
export function useTranslation() {
  return useContext(I18nContext);
}

// Utility to detect browser language
export function detectBrowserLanguage(): Language {
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'fr' ? 'fr' : 'en';
}

// Utility to persist language preference
const LANG_STORAGE_KEY = 'ceip_language';

export function getStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'en' || stored === 'fr') return stored;
    return null;
  } catch {
    return null;
  }
}

export function storeLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
}
