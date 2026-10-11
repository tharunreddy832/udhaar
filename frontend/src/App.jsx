import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerLedger } from './pages/CustomerLedger';
import { ImportUpload } from './pages/ImportUpload';
import { ImportHistory } from './pages/ImportHistory';
import { ImportDetails } from './pages/ImportDetails';
import { ReconciliationReview } from './pages/ReconciliationReview';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Business Owner Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:customerId/ledger" element={<CustomerLedger />} />
            <Route path="imports/upload" element={<ImportUpload />} />
            <Route path="imports" element={<ImportHistory />} />
            <Route path="imports/:importId" element={<ImportDetails />} />
            <Route path="reconciliation" element={<ReconciliationReview />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
