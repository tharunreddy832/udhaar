import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UploadCloud, 
  FileCheck2, 
  History,
  BookOpen
} from 'lucide-react';

export const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <BookOpen size={20} />
        </div>
        <div>
          <h1 className="logo-text">Udhaar</h1>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Reconciliation AI
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          end
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/customers" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>Customers</span>
        </NavLink>

        <NavLink 
          to="/imports/upload" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <UploadCloud size={18} />
          <span>Import Records</span>
        </NavLink>

        <NavLink 
          to="/reconciliation" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <FileCheck2 size={18} />
          <span>Reconciliation Review</span>
        </NavLink>

        <NavLink 
          to="/imports" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          end
        >
          <History size={18} />
          <span>Import History</span>
        </NavLink>
      </nav>
    </aside>
  );
};
