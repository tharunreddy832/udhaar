import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { GlobalSearchModal } from './GlobalSearchModal';
import {
  BookOpen,
  LayoutDashboard,
  Users,
  UploadCloud,
  FileCheck2,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  User,
  ShieldCheck,
  AlertTriangle,
  History,
  CheckCircle2,
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real badge counts
  const [pendingReconCount, setPendingReconCount] = useState(0);
  const [awaitingRecordsCount, setAwaitingRecordsCount] = useState(0);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Fetch real counts for notifications and badge
  const fetchCounts = () => {
    api.get('/api/dashboard/summary')
      .then((res) => {
        const d = res.data;
        if (d) {
          setPendingReconCount(d.pendingReconciliationCount || 0);
          setAwaitingRecordsCount(d.recordsAwaitingReviewCount || 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+K or / for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalAlerts = pendingReconCount + awaitingRecordsCount;

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-inner">
          {/* Brand Mark & Wordmark */}
          <Link to="/" className="nav-brand">
            <div className="brand-icon-box">
              <BookOpen size={20} strokeWidth={2.2} />
            </div>
            <div className="brand-info">
              <span className="brand-title">Udhaar</span>
              <span className="brand-tagline">Financial records, reconciled.</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav>
            <ul className="nav-links">
              <li>
                <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <LayoutDashboard size={16} />
                  <span>Overview</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/customers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Users size={16} />
                  <span>Customers</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/imports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <UploadCloud size={16} />
                  <span>Imports</span>
                  {awaitingRecordsCount > 0 && (
                    <span className="nav-badge nav-badge-amber">{awaitingRecordsCount}</span>
                  )}
                </NavLink>
              </li>
              <li>
                <NavLink to="/reconciliation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <FileCheck2 size={16} />
                  <span>Reconciliation</span>
                  {pendingReconCount > 0 && (
                    <span className="nav-badge nav-badge-amber">{pendingReconCount}</span>
                  )}
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* Right Controls: Search, Notifications, Profile */}
          <div className="nav-actions">
            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="search-trigger-btn"
              title="Global customer & transaction search (Ctrl+K)"
            >
              <Search size={14} />
              <span>Search workspace...</span>
              <kbd className="kbd-shortcut">Ctrl K</kbd>
            </button>

            {/* Notifications Popover */}
            <div className="user-menu-wrapper" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: notifOpen ? 'var(--paper-inset)' : 'transparent',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Notifications & pending reviews"
              >
                <Bell size={16} />
                {totalAlerts > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--amber)',
                      boxShadow: '0 0 0 2px #FFF',
                    }}
                  />
                )}
              </button>

              {notifOpen && (
                <div className="user-dropdown" style={{ width: '290px' }}>
                  <div className="user-dropdown-header">
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink)' }}>
                      Reconciliation Alerts
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Real pending items from your store
                    </div>
                  </div>

                  {totalAlerts === 0 ? (
                    <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: '12.5px' }}>
                      <CheckCircle2 size={24} color="var(--emerald)" style={{ margin: '0 auto 6px' }} />
                      <div>All records reconciled!</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted-light)', marginTop: '2px' }}>
                        No pending matches or review items
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
                      {pendingReconCount > 0 && (
                        <div
                          onClick={() => {
                            setNotifOpen(false);
                            navigate('/reconciliation');
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'var(--amber-bg)',
                            border: '1px solid var(--amber-border)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#B26E12' }}>
                              {pendingReconCount} Reconciliation Matches
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              Awaiting verification
                            </div>
                          </div>
                          <span className="badge badge-amber">Review</span>
                        </div>
                      )}

                      {awaitingRecordsCount > 0 && (
                        <div
                          onClick={() => {
                            setNotifOpen(false);
                            navigate('/imports');
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'var(--paper-warm)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--ink)' }}>
                              {awaitingRecordsCount} Unreviewed Records
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              Requires customer match approval
                            </div>
                          </div>
                          <span className="badge badge-neutral">Inspect</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="user-menu-wrapper" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="user-menu-btn"
                title="Account & Store Settings"
              >
                <div className="user-avatar-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-menu-info">
                  <div className="user-menu-name">{user?.name || 'Store Owner'}</div>
                  <div className="user-menu-role">{user?.role || 'BUSINESS_OWNER'}</div>
                </div>
                <ChevronDown size={14} color="var(--muted)" />
              </button>

              {profileOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink)' }}>
                      {user?.name || 'Store Owner'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', wordBreak: 'break-all' }}>
                      {user?.email}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <span className="badge badge-cobalt" style={{ fontSize: '10px' }}>
                        {user?.role || 'BUSINESS_OWNER'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/customers');
                    }}
                    className="user-dropdown-item"
                  >
                    <Users size={15} />
                    <span>Manage Customers</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/imports/upload');
                    }}
                    className="user-dropdown-item"
                  >
                    <UploadCloud size={15} />
                    <span>Upload New Statement</span>
                  </button>

                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="user-dropdown-item danger"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-nav-toggle"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              top: 'var(--topbar-height)',
              left: 0,
              right: 0,
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-md)',
              zIndex: 99,
            }}
          >
            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </NavLink>
            <NavLink
              to="/customers"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Customers</span>
            </NavLink>
            <NavLink
              to="/imports"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <UploadCloud size={18} />
              <span>Imports</span>
            </NavLink>
            <NavLink
              to="/reconciliation"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <FileCheck2 size={18} />
              <span>Reconciliation</span>
            </NavLink>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="btn btn-danger-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <LogOut size={16} />
                <span>Logout ({user?.email})</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Search Interactive Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
