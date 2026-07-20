import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import './styles/global.css';
import { useAppStore } from './store/appStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import CRM from './pages/CRM';
import Analytics from './pages/Analytics';
import Configuracoes from './pages/Configuracoes';
import { Zap } from 'lucide-react';

function AppLoader() {
  const { authLoading, restoreSession } = useAppStore();

  useEffect(() => {
    restoreSession();
  }, []);

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-logo">
          <Zap size={32} fill="currentColor" />
        </div>
        <div className="app-loading-spinner" />
        <p className="app-loading-text">Carregando Guma Leads...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppLoader />;
}
