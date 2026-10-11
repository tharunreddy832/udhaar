import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const Layout = () => {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="workspace-canvas">
        <Outlet />
      </main>
    </div>
  );
};
