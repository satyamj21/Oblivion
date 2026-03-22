import React, { useState, memo } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, Database, AlertTriangle,
  Shield, Wrench, Activity, Zap
} from 'lucide-react';

import Dashboard       from './pages/Dashboard';
import Inventory       from './pages/Inventory';
import ZombieCenter    from './pages/ZombieCenter';
import SecurityPosture from './pages/SecurityPosture';
import Remediation     from './pages/Remediation';
import Monitoring      from './pages/Monitoring';
import './App.css';

const NAV = [
  { to: '/',            label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/inventory',   label: 'API Inventory', icon: Database,      count: true },
  { to: '/zombies',     label: 'Zombie APIs',   icon: AlertTriangle, badge: true  },
  { to: '/security',    label: 'Security',      icon: Shield },
  { to: '/remediation', label: 'Remediation',   icon: Wrench },
  { to: '/monitoring',  label: 'Monitoring',    icon: Activity,      live: true   },
];

/* Sidebar is permanent — no toggle, no close button */
const Sidebar = memo(({ counts }) => (
  <aside className="sidebar">
    {/* Logo */}
    <div className="sb-logo">
      <div className="sb-logo-icon">⚡</div>
      <div>
        <div className="sb-logo-name">Oblivion</div>
        <div className="sb-logo-tag">API Ghost Defence</div>
      </div>
    </div>

    {/* Main navigation */}
    <div className="sb-section">
      <div className="sb-section-title">Navigation</div>
      {NAV.map(({ to, label, icon: Icon, count, badge, live }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}
        >
          <span className="sb-icon"><Icon size={15} /></span>
          <span className="sb-label">{label}</span>
          {badge && (counts?.zombie || 0) > 0 && (
            <span className="sb-badge-pill">{counts.zombie}</span>
          )}
          {count && (counts?.total || 0) > 0 && (
            <span className="sb-badge-pill"
              style={{ background:'rgba(255,255,255,0.1)', color:'#cbd5e1' }}>
              {counts.total}
            </span>
          )}
          {live && <span className="sb-badge-live">LIVE</span>}
        </NavLink>
      ))}
    </div>

    <div className="sb-divider" />

    {/* System status */}
    <div className="sb-status">
      <div className="sb-section-title" style={{ padding:'0 8px', marginBottom:6 }}>System</div>
      <div className="sb-status-row">
        <span className="sb-status-dot pulse" style={{ background:'#86efac' }} />
        Scanner Active
      </div>
      <div className="sb-status-row">
        <span className="sb-status-dot" style={{ background:'#86efac' }} />
        MongoDB Connected
      </div>
      <div className="sb-status-row">
        <span className="sb-status-dot" style={{ background:'#fcd34d' }} />
        ELK — Setup needed
      </div>
    </div>

    {/* Footer */}
    <div className="sb-footer">
      <div className="sb-footer-name">Oblivion Platform</div>
      <div className="sb-footer-ver">v2.0.0 · Banking Grade</div>
    </div>
  </aside>
));

export default function App() {
  const [counts, setCounts] = useState({});

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar counts={counts} />

        <main className="main-area">
          <Routes>
            <Route path="/"            element={<Dashboard onCountsLoad={setCounts} />} />
            <Route path="/inventory"   element={<Inventory />} />
            <Route path="/zombies"     element={<ZombieCenter />} />
            <Route path="/security"    element={<SecurityPosture />} />
            <Route path="/remediation" element={<Remediation />} />
            <Route path="/monitoring"  element={<Monitoring />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1c1917',
            border: '1px solid #e7e5e4',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: "'Syne', sans-serif",
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          },
        }}
      />
    </BrowserRouter>
  );
}
