import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { EnergyDataDashboard } from './components/EnergyDataDashboard';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { ProfilePage } from './components/ProfilePage';
import { BadgesPage } from './components/BadgesPage';
import { CertificatesPage } from './components/CertificatesPage';
import { CertificateTrackPage } from './components/CertificateTrackPage';
import { PricingPage } from './components/PricingPage';
import { ModulePlayer } from './components/modules';
import { HelpProvider } from './components/HelpProvider';
import { AuthProvider } from './components/auth';
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
    { path: '/digital-twin', element: <EnergyDataDashboard initialTab="DigitalTwin" /> },
    { path: '/climate-policy', element: <EnergyDataDashboard initialTab="ClimatePolicy" /> },
    { path: '/my-energy-ai', element: <EnergyDataDashboard initialTab="HouseholdAdvisor" /> },
    { path: '/household-advisor', element: <EnergyDataDashboard initialTab="HouseholdAdvisor" /> },
    { path: '/about', element: <AboutPage /> },
    { path: '/contact', element: <ContactPage /> },
    { path: '/profile', element: <ProfilePage /> },
    { path: '/badges', element: <BadgesPage /> },
    { path: '/certificates', element: <CertificatesPage /> },
    { path: '/certificates/:trackSlug', element: <CertificateTrackPage /> },
    { path: '/modules/:moduleId', element: <ModulePlayer /> },
    { path: '/pricing', element: <PricingPage /> }
  ],
  {
    future: routerFutureConfig
  }
);

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <HelpProvider>
          <RouterProvider router={router} />
        </HelpProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
