import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, X, Users, BookOpen, ArrowRight, Wallet } from 'lucide-react';

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setLoading(true);
      api.get('/api/customers')
        .then((res) => setCustomers(res.data || []))
        .catch((err) => console.error('Failed to load customers for search:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCustomers = query.trim()
    ? customers.filter((c) =>
        c.name?.toLowerCase().includes(query.toLowerCase()) ||
        c.phone?.includes(query) ||
        c.address?.toLowerCase().includes(query.toLowerCase())
      )
    : customers.slice(0, 6);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const handleSelectCustomer = (customerId) => {
    onClose();
    navigate(`/customers/${customerId}/ledger`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card search-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '18px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            type="text"
            className="search-input-hero"
            placeholder="Search customers by name, phone, or address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button
            onClick={onClose}
            className="modal-close-btn"
            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}
            title="Close search"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', maxHeight: '380px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.6px', marginBottom: '10px' }}>
            {query.trim() ? `Search Results (${filteredCustomers.length})` : 'Recent Customers'}
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
              Searching workspace records...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              No customer records match "{query}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--paper-warm)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--cobalt-light)';
                    e.currentTarget.style.borderColor = 'var(--cobalt)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--paper-warm)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--ink)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>{c.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{c.phone || 'No phone'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Balance</div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: (c.outstandingBalance || 0) > 0 ? '#B26E12' : 'var(--emerald)'
                      }}>
                        {formatINR(c.outstandingBalance)}
                      </div>
                    </div>
                    <ArrowRight size={14} color="var(--muted)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--paper-warm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--muted)',
        }}>
          <span>Press <strong>ESC</strong> to close</span>
          <span>Click any customer to open their financial ledger</span>
        </div>
      </div>
    </div>
  );
};
