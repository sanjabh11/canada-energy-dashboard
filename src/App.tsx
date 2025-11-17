import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <HelpProvider>
          <Router>
            <Routes>
              <Route path="/" element={<EnergyDataDashboard />} />
              <Route path="/dashboard" element={<EnergyDataDashboard />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/badges" element={<BadgesPage />} />
              <Route path="/certificates" element={<CertificatesPage />} />
              <Route path="/certificates/:trackSlug" element={<CertificateTrackPage />} />
              <Route path="/modules/:moduleId" element={<ModulePlayer />} />
              <Route path="/pricing" element={<PricingPage />} />
            </Routes>
          </Router>
        </HelpProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
