import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EnergyDataDashboard } from './components/EnergyDataDashboard';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { ProfilePage } from './components/ProfilePage';
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
            </Routes>
          </Router>
        </HelpProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
