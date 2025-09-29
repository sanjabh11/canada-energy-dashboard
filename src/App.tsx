import React from 'react';
import { EnergyDataDashboard } from './components/EnergyDataDashboard';
import { HelpProvider } from './components/HelpProvider';
import './App.css';
import './styles/layout.css';

function App() {
  return (
    <div className="App">
      <HelpProvider>
        <EnergyDataDashboard />
      </HelpProvider>
    </div>
  );
}

export default App;
