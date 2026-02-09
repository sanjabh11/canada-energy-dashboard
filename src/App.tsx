import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { I18nProvider } from './components/I18nProvider';
import { SkipToMain } from './components/ui/SkipToMain';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorFallback } from './components/RouteErrorFallback';
import { PaddleProvider } from './components/billing/PaddleProvider';
import { HelpProvider } from './components/HelpProvider';
import { AuthProvider } from './components/auth';
import { ThemeProvider } from './lib/ThemeContext';
import './App.css';
import './styles/layout.css';

// ============================================================================
// LAZY-LOADED ROUTE COMPONENTS (code-split into separate chunks)
// ============================================================================
const EnergyDataDashboard = React.lazy(() => import('./components/EnergyDataDashboard').then(m => ({ default: m.EnergyDataDashboard })));
const AnalyticsTrendsDashboard = React.lazy(() => import('./components/AnalyticsTrendsDashboard'));
const AboutPage = React.lazy(() => import('./components/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = React.lazy(() => import('./components/ContactPage').then(m => ({ default: m.ContactPage })));
const ProfilePage = React.lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage = React.lazy(() => import('./components/SettingsPage'));
const BadgesPage = React.lazy(() => import('./components/BadgesPage').then(m => ({ default: m.BadgesPage })));
const CertificatesPage = React.lazy(() => import('./components/CertificatesPage').then(m => ({ default: m.CertificatesPage })));
const CertificateTrackPage = React.lazy(() => import('./components/CertificateTrackPage').then(m => ({ default: m.CertificateTrackPage })));
const PricingPage = React.lazy(() => import('./components/PricingPage').then(m => ({ default: m.PricingPage })));
const LandfillMethane = React.lazy(() => import('./components/LandfillMethane'));
const ModulePlayer = React.lazy(() => import('./components/modules').then(m => ({ default: m.ModulePlayer })));
const CohortAdminPage = React.lazy(() => import('./components/CohortAdminPage').then(m => ({ default: m.CohortAdminPage })));
const ApiKeysPage = React.lazy(() => import('./components/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const FunderReportingDashboard = React.lazy(() => import('./components/FunderReportingDashboard').then(m => ({ default: m.FunderReportingDashboard })));
const EmployersPage = React.lazy(() => import('./components/EmployersPage').then(m => ({ default: m.EmployersPage })));
const IncubatorsPage = React.lazy(() => import('./components/IncubatorsPage').then(m => ({ default: m.IncubatorsPage })));
const TrainingCoordinatorsPage = React.lazy(() => import('./components/TrainingCoordinatorsPage').then(m => ({ default: m.TrainingCoordinatorsPage })));
// Whop Integration Pages
const WhopExperiencePage = React.lazy(() => import('./components/WhopExperiencePage').then(m => ({ default: m.WhopExperiencePage })));
const WhopDashboardPage = React.lazy(() => import('./components/WhopDashboardPage').then(m => ({ default: m.WhopDashboardPage })));
const WhopDiscoverPage = React.lazy(() => import('./components/WhopDiscoverPage').then(m => ({ default: m.WhopDiscoverPage })));
// Gemini Strategy Features (Alberta-Focused)
const MicroGenWizard = React.lazy(() => import('./components/MicroGenWizard').then(m => ({ default: m.MicroGenWizard })));
const RROAlertSystem = React.lazy(() => import('./components/RROAlertSystem').then(m => ({ default: m.RROAlertSystem })));
const AICEIReportingModule = React.lazy(() => import('./components/AICEIReportingModule').then(m => ({ default: m.AICEIReportingModule })));
// Whop Quiz Pivot
const QuizApp = React.lazy(() => import('./components/whop/QuizApp').then(m => ({ default: m.QuizApp })));
const QuizDashboard = React.lazy(() => import('./components/whop/QuizDashboard').then(m => ({ default: m.QuizDashboard })));
const GuestQuizPlayer = React.lazy(() => import('./components/whop/GuestQuizPlayer').then(m => ({ default: m.GuestQuizPlayer })));
const WatchdogApp = React.lazy(() => import('./components/whop/WatchdogApp').then(m => ({ default: m.WatchdogApp })));
// Legal Pages (Whop Compliance - Criteria 14, 15)
const PrivacyPolicy = React.lazy(() => import('./components/legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = React.lazy(() => import('./components/legal/TermsOfService').then(m => ({ default: m.TermsOfService })));
const RefundPolicy = React.lazy(() => import('./components/legal/RefundPolicy').then(m => ({ default: m.RefundPolicy })));
// Enterprise (Bypasses Whop for B2B)
const EnterprisePage = React.lazy(() => import('./components/enterprise/EnterprisePage').then(m => ({ default: m.EnterprisePage })));
const MunicipalLandingPage = React.lazy(() => import('./components/MunicipalLandingPage').then(m => ({ default: m.MunicipalLandingPage })));
const RetailerHedgingDashboard = React.lazy(() => import('./components/RetailerHedgingDashboard').then(m => ({ default: m.RetailerHedgingDashboard })));
const TIERROICalculator = React.lazy(() => import('./components/TIERROICalculator').then(m => ({ default: m.TIERROICalculator })));
// Value Prop Research Dec 2025 - MEDIUM Priority Features
const ShadowBillingModule = React.lazy(() => import('./components/ShadowBillingModule').then(m => ({ default: m.ShadowBillingModule })));
const DIPAuditTrailGenerator = React.lazy(() => import('./components/DIPAuditTrailGenerator').then(m => ({ default: m.DIPAuditTrailGenerator })));
const BankReadyExport = React.lazy(() => import('./components/BankReadyExport').then(m => ({ default: m.BankReadyExport })));
const CompetitorComparison = React.lazy(() => import('./components/CompetitorComparison').then(m => ({ default: m.CompetitorComparison })));
// Value Prop Research Dec 2025 - LOW Priority Features
const SovereignDataVault = React.lazy(() => import('./components/SovereignDataVault').then(m => ({ default: m.SovereignDataVault })));
const CreditBankingDashboard = React.lazy(() => import('./components/CreditBankingDashboard').then(m => ({ default: m.CreditBankingDashboard })));
// Open API Documentation (Gartner Integration)
const OpenAPIDocsPage = React.lazy(() => import('./components/OpenAPIDocsPage').then(m => ({ default: m.OpenAPIDocsPage })));
// Whop Mini-App (Isolated, zero-auth for Whop App Store)
const WhopMiniApp = React.lazy(() => import('./components/whop-mini/WhopMiniApp'));

// Lightweight loading fallback for Suspense
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
} as const;

const router = createBrowserRouter(
  [
    {
      errorElement: <RouteErrorFallback />,
      children: [
        { path: '/', element: <EnergyDataDashboard /> },
        { path: '/dashboard', element: <EnergyDataDashboard /> },

        // Analytics & Trends - Standalone Route
        { path: '/analytics', element: <AnalyticsTrendsDashboard /> },
        { path: '/analytics-trends', element: <AnalyticsTrendsDashboard /> },

        // Whop Integration Routes (CRITICAL for Whop App Store)
        { path: '/whop/experience', element: <WhopExperiencePage /> },
        { path: '/whop/experience/:experienceId', element: <WhopExperiencePage /> },
        { path: '/whop/experience/:experienceId/*', element: <WhopExperiencePage /> },
        { path: '/whop/dashboard', element: <WhopDashboardPage /> },
        { path: '/whop/discover', element: <WhopDiscoverPage /> },

        // Whop Mini-App (ISOLATED - Zero auth, zero external APIs for Whop App Store)
        { path: '/whop-mini/*', element: <WhopMiniApp /> },

        // Renewable Energy Optimization Hub
        { path: '/renewable-optimization', element: <EnergyDataDashboard initialTab="RenewableOptimization" /> },
        { path: '/renewable-hub', element: <EnergyDataDashboard initialTab="RenewableOptimization" /> },
        // Curtailment Reduction Analytics
        { path: '/curtailment-reduction', element: <EnergyDataDashboard initialTab="CurtailmentAnalytics" /> },
        // Infrastructure Resilience / Climate Scenario Modeling
        { path: '/resilience', element: <EnergyDataDashboard initialTab="Resilience" /> },
        { path: '/arctic-energy', element: <EnergyDataDashboard initialTab="ArcticEnergy" /> },
        // Existing feature routes
        { path: '/digital-twin', element: <EnergyDataDashboard initialTab="DigitalTwin" /> },
        { path: '/climate-policy', element: <EnergyDataDashboard initialTab="ClimatePolicy" /> },
        { path: '/my-energy-ai', element: <EnergyDataDashboard initialTab="HouseholdAdvisor" /> },
        { path: '/household-advisor', element: <EnergyDataDashboard initialTab="HouseholdAdvisor" /> },
        { path: '/about', element: <AboutPage /> },
        { path: '/contact', element: <ContactPage /> },
        { path: '/profile', element: <ProfilePage /> },
        { path: '/settings', element: <SettingsPage /> },
        { path: '/badges', element: <BadgesPage /> },
        { path: '/certificates', element: <CertificatesPage /> },
        { path: '/certificates/:trackSlug', element: <CertificateTrackPage /> },
        { path: '/modules/:moduleId', element: <ModulePlayer /> },
        { path: '/pricing', element: <PricingPage /> },
        { path: '/admin/cohorts', element: <CohortAdminPage /> },
        { path: '/api-keys', element: <ApiKeysPage /> },
        // Indigenous Energy Platform
        { path: '/indigenous', element: <EnergyDataDashboard initialTab="Indigenous" /> },
        { path: '/indigenous/reporting', element: <FunderReportingDashboard /> },
        { path: '/funder-reporting', element: <FunderReportingDashboard /> },
        // HERO FEATURES - Production Ready
        // { path: '/tier-calculator', element: <TIERCreditCalculator /> }, // TODO: Recreate - corrupted in all commits
        { path: '/landfill-methane', element: <LandfillMethane /> },
        // Employer & Incubator Pages (Gap #8, #9)
        { path: '/employers', element: <EmployersPage /> },
        { path: '/incubators', element: <IncubatorsPage /> },
        { path: '/for-employers', element: <EmployersPage /> },
        { path: '/hire-me', element: <EmployersPage /> },
        { path: '/ctn', element: <IncubatorsPage /> },
        // Gemini Strategy: Alberta-Focused Tools
        { path: '/solar-wizard', element: <MicroGenWizard /> },
        { path: '/micro-gen', element: <MicroGenWizard /> },
        { path: '/rate-alerts', element: <RROAlertSystem /> },
        { path: '/rro', element: <RROAlertSystem /> },
        { path: '/indigenous/aicei', element: <AICEIReportingModule /> },
        { path: '/aicei', element: <AICEIReportingModule /> },
        // Monetization Strategy: Training Coordinator Cohort Sales
        { path: '/training-coordinators', element: <TrainingCoordinatorsPage /> },
        { path: '/cohorts', element: <TrainingCoordinatorsPage /> },
        { path: '/for-training', element: <TrainingCoordinatorsPage /> },

        // B2G Municipal & B2B Utility Sales (Research-Driven)
        { path: '/municipal', element: <MunicipalLandingPage /> },
        { path: '/for-municipalities', element: <MunicipalLandingPage /> },
        { path: '/hedging', element: <RetailerHedgingDashboard /> },
        { path: '/retailer-tools', element: <RetailerHedgingDashboard /> },

        // Industrial TIER Arbitrage (Value Prop Research Dec 2025)
        { path: '/roi-calculator', element: <TIERROICalculator /> },
        { path: '/industrial', element: <TIERROICalculator /> },
        { path: '/tier-savings', element: <TIERROICalculator /> },

        // Value Prop Research Dec 2025 - MEDIUM Priority Routes
        { path: '/shadow-billing', element: <ShadowBillingModule /> },
        { path: '/bill-comparison', element: <ShadowBillingModule /> },
        { path: '/dip-audit', element: <DIPAuditTrailGenerator /> },
        { path: '/direct-investment', element: <DIPAuditTrailGenerator /> },
        { path: '/bank-export', element: <BankReadyExport /> },
        { path: '/green-loan', element: <BankReadyExport /> },
        { path: '/compare', element: <CompetitorComparison /> },
        { path: '/vs-competitors', element: <CompetitorComparison /> },

        // Value Prop Research Dec 2025 - LOW Priority Routes
        { path: '/sovereign-vault', element: <SovereignDataVault /> },
        { path: '/ocap-data', element: <SovereignDataVault /> },
        { path: '/data-sovereignty', element: <SovereignDataVault /> },
        { path: '/credit-banking', element: <CreditBankingDashboard /> },
        { path: '/tier-credits', element: <CreditBankingDashboard /> },
        { path: '/buy-credits', element: <CreditBankingDashboard /> },

        // Open API Documentation (Gartner Integration)
        { path: '/api-docs', element: <OpenAPIDocsPage /> },
        { path: '/api', element: <OpenAPIDocsPage /> },
        { path: '/developers', element: <OpenAPIDocsPage /> },

        // Whop "Energy Quiz Pro" Pivot (Client-Side Only)
        {
          path: '/whop/quiz',
          element: <QuizApp />,
          children: [
            { index: true, element: <QuizDashboard /> },
            { path: 'modules/:moduleId', element: <GuestQuizPlayer /> }
          ]
        },
        { path: '/whop-quiz', element: <Navigate to="/whop/quiz" replace /> },

        // Whop "Alberta Rate Watchdog" - Primary Wedge Product
        { path: '/whop/watchdog', element: <WatchdogApp /> },
        { path: '/watchdog', element: <Navigate to="/whop/watchdog" replace /> },

        // Legal Pages (Whop Compliance - Criteria 14, 15)
        { path: '/privacy', element: <PrivacyPolicy /> },
        { path: '/terms', element: <TermsOfService /> },
        { path: '/refund', element: <RefundPolicy /> },

        // Enterprise (Bypasses Whop for B2B - whop_criterias.md Section 7)
        { path: '/enterprise', element: <EnterprisePage /> },

        // 404 catch-all
        { path: '*', element: <RouteErrorFallback /> },
      ],
    },
  ]
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PaddleProvider>
          <div className="App">
            <I18nProvider>
              <AuthProvider>
                <HelpProvider>
                  <SkipToMain targetId="main-content" />
                  <Suspense fallback={<RouteLoader />}>
                    <RouterProvider router={router} future={routerFutureConfig} />
                  </Suspense>
                </HelpProvider>
              </AuthProvider>
            </I18nProvider>
          </div>
        </PaddleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
