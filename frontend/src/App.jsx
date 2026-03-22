import React, { useState, useCallback, memo } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, Database, AlertTriangle, Shield,
  Wrench, Activity, Menu, X, Zap, Radio
} from 'lucide-react';

import Dashboard       from './pages/Dashboard';
import Inventory       from './pages/Inventory';
import ZombieCenter    from './pages/ZombieCenter';
import SecurityPosture from './pages/SecurityPosture';
import Remediation     from './pages/Remediation';
import Monitoring      from './pages/Monitoring';
import './App.css';

const NAV_MAIN = [
  { to: '/',            label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/inventory',   label: 'API Inventory',  icon: Database,       count: true },
  { to: '/monitoring',  label: 'Monitoring',     icon: Activity,       live: true },
  { to: '/security',    label: 'Reports',        icon: Shield },
];

const THREAT_ITEMS = [
  { label: 'Shadow',     color: '#ef4444', to: '/zombies' },
  { label: 'Zombie',     color: '#f97316', to: '/zombies' },
  { label: 'Stale',      color: '#8b5cf6', to: '/zombies' },
  { label: 'Active',     color: '#10b981', to: '/inventory' },
];

const Sidebar = memo(({ open, onClose, counts }) => (
  <aside className={`sidebar${open ? '' : ' collapsed'}`}>
    {/* Logo */}
    <div className="sb-logo">
      <div className="sb-logo-icon"><Zap size={16} /></div>
      <div className="sb-logo-text">
        <span className="sb-logo-name">Oblivion</span>
        <span className="sb-logo-sub">API Ghost Defence</span>
      </div>
      <button className="sb-close" onClick={onClose}><X size={14} /></button>
    </div>

    {/* Main nav */}
    <div className="sb-section-label">Main Menu</div>
    <nav className="sb-nav">
      {NAV_MAIN.map(({ to, label, icon: Icon, count, live }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}
        >
          <span className="sb-link-icon"><Icon size={15} /></span>
          <span className="sb-link-label">{label}</span>
          {count && counts?.total > 0 && (
            <span className="sb-count">{counts.total}</span>
          )}
          {live && (
            <span className="sb-live">Live</span>
          )}
        </NavLink>
      ))}
    </nav>

    {/* Threat summary */}
    <div className="sb-section-label" style={{ marginTop: 8 }}>Threat Summary</div>
    <div className="sb-threats">
      {THREAT_ITEMS.map(t => (
        <NavLink key={t.label} to={t.to} className="sb-threat-row">
          <span className="sb-threat-dot" style={{ background: t.color }} />
          <span className="sb-threat-label">{t.label}</span>
          <span className="sb-threat-count">
            {t.label === 'Active'
              ? (counts?.active || 0)
              : t.label === 'Zombie'
              ? (counts?.zombie || 0)
              : t.label === 'Shadow'
              ? (counts?.orphaned || 0)
              : (counts?.deprecated || 0)
            }
          </span>
        </NavLink>
      ))}
    </div>

    {/* Footer */}
    <div className="sb-footer">
      <span className="sb-scanner-dot" />
      <span className="sb-scanner-text">Scanner Active</span>
      <span className="sb-version">Oblivion v2.0</span>
    </div>
  </aside>
));

export default function App() {
  const [open, setOpen] = useState(true);
  const [counts, setCounts] = useState({});
  const close = useCallback(() => setOpen(false), []);
  const openS = useCallback(() => setOpen(true),  []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <button className={`hamburger${open ? ' hidden' : ''}`} onClick={openS} aria-label="Open">
          <Menu size={16} />
        </button>

        <Sidebar open={open} onClose={close} counts={counts} />

        {open && <div className="sb-backdrop" onClick={close} />}

        <main className={`main-area${open ? '' : ' full'}`}>
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
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '13px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          },
        }}
      />
    </BrowserRouter>
  );
}
