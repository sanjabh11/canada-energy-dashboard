import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { I18nProvider } from './components/I18nProvider';
import { SkipToMain } from './components/ui/SkipToMain';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EnergyDataDashboard } from './components/EnergyDataDashboard';
import AnalyticsTrendsDashboard from './components/AnalyticsTrendsDashboard';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { ProfilePage } from './components/ProfilePage';
import SettingsPage from './components/SettingsPage';
import { BadgesPage } from './components/BadgesPage';
import { CertificatesPage } from './components/CertificatesPage';
import { CertificateTrackPage } from './components/CertificateTrackPage';
import { PricingPage } from './components/PricingPage';
import { PaddleProvider } from './components/billing/PaddleProvider';
// import TIERCreditCalculator from './components/TIERCreditCalculator'; // Removed - file corrupted in all commits
import LandfillMethane from './components/LandfillMethane';
import { ModulePlayer } from './components/modules';
import { CohortAdminPage } from './components/CohortAdminPage';
import { ApiKeysPage } from './components/ApiKeysPage';
import { ApiDocsPage } from './components/ApiDocsPage';
import { FunderReportingDashboard } from './components/FunderReportingDashboard';
import { EmployersPage } from './components/EmployersPage';
import { IncubatorsPage } from './components/IncubatorsPage';
import { TrainingCoordinatorsPage } from './components/TrainingCoordinatorsPage';
import { HelpProvider } from './components/HelpProvider';
import { AuthProvider } from './components/auth';
// Whop Integration Pages
import { WhopExperiencePage } from './components/WhopExperiencePage';
import { WhopDashboardPage } from './components/WhopDashboardPage';
import { WhopDiscoverPage } from './components/WhopDiscoverPage';
// Gemini Strategy Features (Alberta-Focused)
import { MicroGenWizard } from './components/MicroGenWizard';
import { RROAlertSystem } from './components/RROAlertSystem';
import { AICEIReportingModule } from './components/AICEIReportingModule';
// Whop Quiz Pivot
import { QuizApp } from './components/whop/QuizApp';
import { QuizDashboard } from './components/whop/QuizDashboard';
import { GuestQuizPlayer } from './components/whop/GuestQuizPlayer';
import { WatchdogApp } from './components/whop/WatchdogApp';
import { ThemeProvider } from './lib/ThemeContext';
import { Navigate } from 'react-router-dom';
// Legal Pages (Whop Compliance - Criteria 14, 15)
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsOfService } from './components/legal/TermsOfService';
import { RefundPolicy } from './components/legal/RefundPolicy';
// Enterprise (Bypasses Whop for B2B)
import { EnterprisePage } from './components/enterprise/EnterprisePage';
import { MunicipalLandingPage } from './components/MunicipalLandingPage';
import { RetailerHedgingDashboard } from './components/RetailerHedgingDashboard';
import { TIERROICalculator } from './components/TIERROICalculator';
import './App.css';
import './styles/layout.css';

const routerFutureConfig: any = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

const router = createBrowserRouter(
  [
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
    { path: '/api-docs', element: <ApiDocsPage /> },
    { path: '/docs/api', element: <ApiDocsPage /> },
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
    { path: '/enterprise', element: <EnterprisePage /> }
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
                  <RouterProvider router={router} future={routerFutureConfig} />
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
