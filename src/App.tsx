import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EnergyDataDashboard } from './components/EnergyDataDashboard';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { HelpProvider } from './components/HelpProvider';
import './App.css';
import './styles/layout.css';

function App() {
  return (
    <div className="App">
      <HelpProvider>
        <Router>
          <Routes>
            <Route path="/" element={<EnergyDataDashboard />} />
            <Route path="/dashboard" element={<EnergyDataDashboard />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </Router>
      </HelpProvider>
    </div>
  );
}

export default App;
