import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  History,
  UploadCloud,
  ArrowRight,
  FileSpreadsheet,
  MessageSquare,
  BookOpen,
  RefreshCw,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';

export const ImportHistory = () => {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchImports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/imports');
      setImports(res.data || []);
    } catch (err) {
      console.error('Error fetching imports:', err);
      setError('Failed to load import history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, []);

  const getSourceIcon = (type) => {
    switch (type) {
      case 'UPI_STATEMENT':
        return <FileSpreadsheet size={16} color="var(--cobalt)" />;
      case 'CHAT':
        return <MessageSquare size={16} color="var(--emerald)" />;
      case 'NOTEBOOK':
        return <BookOpen size={16} color="var(--amber)" />;
      default:
        return <FileText size={16} color="var(--muted)" />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Import History</h1>
          <p className="page-subtitle">
            Chronological audit of statement uploads, handwriting scans, and extraction batches
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchImports} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/imports/upload" className="btn btn-primary">
            <UploadCloud size={16} />
            <span>Upload New Statement</span>
          </Link>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13.5px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      <div className="paper-box" style={{ overflow: 'hidden' }}>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Document File Name</th>
              <th style={{ width: '150px' }}>Source Format</th>
              <th style={{ width: '150px' }}>Upload Date</th>
              <th style={{ width: '140px' }}>Status</th>
              <th style={{ width: '150px' }}>Extracted Count</th>
              <th style={{ width: '150px' }}>Approved to Ledger</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                  Loading import batches...
                </td>
              </tr>
            ) : imports.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  No statement files uploaded yet. Click "Upload New Statement" to begin.
                </td>
              </tr>
            ) : (
              imports.map((imp) => {
                const isCompleted = imp.status === 'COMPLETED';
                const isFailed = imp.status === 'FAILED';
                return (
                  <tr key={imp.id}>
                    <td>
                      <Link
                        to={`/imports/${imp.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontWeight: '600',
                          color: 'var(--ink)',
                          textDecoration: 'none',
                        }}
                      >
                        {getSourceIcon(imp.sourceType)}
                        <span>{imp.fileName}</span>
                      </Link>
                    </td>

                    <td>
                      <span className="badge badge-neutral">{imp.sourceType}</span>
                    </td>

                    <td style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {imp.createdAt ? new Date(imp.createdAt).toLocaleDateString() : '—'}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          isCompleted ? 'badge-emerald' : isFailed ? 'badge-danger' : 'badge-amber'
                        }`}
                      >
                        {imp.status}
                      </span>
                    </td>

                    <td>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{imp.totalRecords || 0}</strong> records
                    </td>

                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: '600',
                          color: (imp.processedRecords || 0) > 0 ? 'var(--emerald)' : 'var(--muted)',
                        }}
                      >
                        {imp.processedRecords || 0} / {imp.totalRecords || 0}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/imports/${imp.id}`} className="btn btn-secondary btn-sm">
                        <span>Inspect</span>
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
