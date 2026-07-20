import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import {
  LayoutDashboard,
  Users,
  Kanban,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  ChevronRight,
  Radio,
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: Users, label: 'Leads', to: '/leads' },
  { icon: Kanban, label: 'CRM', to: '/crm' },
  { icon: BarChart3, label: 'Analytics', to: '/analytics' },
  { icon: Settings, label: 'Configurações', to: '/configuracoes' },
];

export default function Sidebar() {
  const { user, logout, activeScans } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} fill="currentColor" />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-brand">Guma</span>
          <span className="sidebar-brand-accent">Leads</span>
        </div>
      </div>

      {/* Live indicator */}
      <div className="sidebar-live">
        <div className="sidebar-live-inner">
          <Radio size={12} className="sidebar-live-icon" />
          <span className="sidebar-live-text">
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            {activeScans} fontes ativas
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="sidebar-nav-label">Navegação</span>
        {navItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
            <ChevronRight size={14} className="sidebar-item-arrow" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.nome.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.nome}</span>
            <span className="sidebar-user-role">{user?.plano} plan</span>
          </div>
        </div>
        <button className="btn-icon sidebar-logout" onClick={handleLogout} title="Sair">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
