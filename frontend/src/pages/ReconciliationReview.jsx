import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import CustomerAvatar from '../components/CustomerAvatar';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Percent,
  Check,
  X,
  CreditCard,
  Wallet,
  Calendar,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Clock,
  ArrowRightLeft,
  ExternalLink,
  Phone,
  MapPin,
  Tag,
  User,
  Info,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

export const ReconciliationReview = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [viewMode, setViewMode] = useState('WORKBENCH'); // 'WORKBENCH' or 'TABLE'

  // Modal for inspecting candidate customer profile
  const [inspectedCustomer, setInspectedCustomer] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/reconciliation/review');
      setMatches(res.data || []);
    } catch (err) {
      console.error('Error fetching review queue:', err);
      setError('Failed to load reconciliation review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleVerify = async (matchId) => {
    setActionLoadingId(matchId);
    setError('');
    try {
      await api.post(`/api/reconciliation/matches/${matchId}/verify`);
      setSuccessMsg('Reconciliation match verified and payment allocated to credit!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchQueue();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify match.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (matchId) => {
    if (!window.confirm('Reject this proposed payment-to-credit allocation match?')) return;
    setActionLoadingId(matchId);
    setError('');
    try {
      await api.post(`/api/reconciliation/matches/${matchId}/reject`);
      setSuccessMsg('Match proposal marked as rejected / unresolved.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchQueue();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject match.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReassignCustomer = async (matchId, newCustomerId, customerName) => {
    setActionLoadingId(matchId);
    setError('');
    try {
      await api.post(`/api/reconciliation/matches/${matchId}/reassign?customerId=${newCustomerId}`);
      setSuccessMsg(`Match party updated to ${customerName}. Review and confirm allocation.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchQueue();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reassign customer.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatPhoneEnding = (phone) => {
    if (!phone) return 'No phone';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `ending ${digits.slice(-4)}`;
    }
    return phone;
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reconciliation Workbench</h1>
          <p className="page-subtitle">
            AI-assisted human-in-the-loop pairing: Photo-assisted customer resolution and payment allocation
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setViewMode('WORKBENCH')}
              className={`filter-tab-btn ${viewMode === 'WORKBENCH' ? 'active' : ''}`}
              title="Visual Triplet Workbench View"
            >
              <LayoutGrid size={14} />
              <span>Workbench</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`filter-tab-btn ${viewMode === 'TABLE' ? 'active' : ''}`}
              title="Compact Table Alternative"
            >
              <TableIcon size={14} />
              <span>Compact Table</span>
            </button>
          </div>

          <button onClick={fetchQueue} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            backgroundColor: 'var(--emerald-bg)',
            border: '1px solid var(--emerald-border)',
            color: '#0E745B',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

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

      {/* QUEUE CONTENT */}
      {loading ? (
        <div className="paper-box" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--muted)' }}>
          Loading candidate reconciliation matches...
        </div>
      ) : matches.length === 0 ? (
        /* REASSURING EMPTY STATE */
        <div
          className="paper-box"
          style={{
            padding: '64px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--emerald-bg)',
              color: 'var(--emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ink)' }}>
              All Accounts Reconciled
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '440px', marginTop: '6px' }}>
              No pending reconciliation matches in queue. When you import new UPI statements or record customer payments, candidate matches will appear here for one-click verification.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Link to="/imports/upload" className="btn btn-primary">
              <span>Import New Statement</span>
            </Link>
            <Link to="/customers" className="btn btn-secondary">
              <span>View Customer Ledgers</span>
            </Link>
          </div>
        </div>
      ) : viewMode === 'WORKBENCH' ? (
        /* SIGNATURE WORKBENCH VIEW: TRIPLET CARDS + CANDIDATE IDENTITY CARDS */
        <div className="workbench-container">
          {matches.map((m) => {
            const confidencePercent = m.confidence ? Math.round(Number(m.confidence) * 100) : null;
            const isActing = actionLoadingId === m.id;
            const hasMultipleCandidates = m.candidateCustomers && m.candidateCustomers.length > 1;

            return (
              <div key={m.id} className="workbench-match-card">
                {/* Triplet Grid: LEFT (Credit & Customer Identity) | CENTER (Connector) | RIGHT (Payment) */}
                <div className="match-triplet-grid">
                  {/* LEFT: Customer Identity & Credit Entry Record */}
                  <div className="match-record-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="match-record-tag" style={{ color: '#B26E12' }}>
                        <Wallet size={13} />
                        <span>Credit Entry Record</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        Credit #{m.creditEntryId}
                      </span>
                    </div>

                    {/* Customer Identity Block with Photo */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '6px' }}>
                      <CustomerAvatar
                        customerId={m.customerId}
                        name={m.customerName}
                        hasPhoto={m.customerHasPhoto}
                        size="md"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          to={`/customers/${m.customerId}/ledger`}
                          style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: 'var(--ink)',
                            textDecoration: 'none',
                            display: 'block',
                          }}
                          title="Open customer ledger"
                        >
                          {m.customerName}
                        </Link>

                        <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={11} />
                          <span>{m.customerPhone || 'No phone'}</span>
                          {m.customerAddress && (
                            <>
                              <span>•</span>
                              <span>{m.customerAddress}</span>
                            </>
                          )}
                        </div>

                        {/* Aliases */}
                        {m.customerAliases && m.customerAliases.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {m.customerAliases.map((al, idx) => (
                              <span key={idx} className="alias-tag" style={{ fontSize: '10px' }}>
                                {al}
                              </span>
                            ))}
                          </div>
                        )}

                        {m.customerNotes && (
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-light)', fontStyle: 'italic', marginTop: '4px' }}>
                            "{m.customerNotes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Original Credit:</span>
                        <div className="match-record-amount" style={{ color: '#B26E12' }}>
                          {formatINR(m.creditAmount)}
                        </div>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                        Date: {m.creditDate}
                      </div>
                    </div>

                    {m.creditDescription && (
                      <div style={{ fontSize: '12px', color: 'var(--ink-light)', background: 'var(--paper-inset)', padding: '6px 10px', borderRadius: 'var(--radius-xs)' }}>
                        Memo: {m.creditDescription}
                      </div>
                    )}
                  </div>

                  {/* CENTER: Matching Connector & Allocation */}
                  <div className="allocation-connector">
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.6px' }}>
                      Proposed Allocation
                    </div>

                    <div className="connector-amount-pill">
                      {formatINR(m.matchedAmount)}
                    </div>

                    <div className="connector-line-visual" />

                    {confidencePercent !== null && (
                      <div className="connector-confidence-meter">
                        <Sparkles size={13} />
                        <span>{confidencePercent}% AI Match</span>
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: 'var(--muted)', maxWidth: '180px', marginTop: '2px' }}>
                      {m.matchType || 'AI Allocation Pair'}
                    </div>
                  </div>

                  {/* RIGHT: Payment Received Record */}
                  <div className="match-record-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="match-record-tag" style={{ color: 'var(--emerald)' }}>
                        <CreditCard size={13} />
                        <span>Payment Received</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        Payment #{m.paymentId}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--ink)' }}>
                        {m.paymentReference || 'Direct Payment'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                        Received: {m.paymentDate}
                      </div>
                    </div>

                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Payment Amount:</span>
                      <div className="match-record-amount" style={{ color: 'var(--emerald)' }}>
                        {formatINR(m.paymentAmount)}
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--ink-light)', background: 'var(--paper-inset)', padding: '6px 10px', borderRadius: 'var(--radius-xs)' }}>
                      Source: Statement / Ingestion
                    </div>
                  </div>
                </div>

                {/* PHOTO-ASSISTED CANDIDATE CUSTOMER DISAMBIGUATION SECTION */}
                {hasMultipleCandidates && (
                  <div
                    style={{
                      background: 'var(--paper-warm)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px 18px',
                      marginTop: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color="var(--cobalt)" />
                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: 'var(--ink)' }}>
                          Similar Name Disambiguation — Candidate Customer Identity Cards
                        </h4>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                        Review photos, aliases, and phone numbers to confirm the exact customer
                      </span>
                    </div>

                    <div className="candidate-grid">
                      {m.candidateCustomers.map((cand, cIdx) => {
                        const isCurrentlyAssigned = cand.id === m.customerId;
                        return (
                          <div
                            key={cand.id}
                            className={`candidate-card ${isCurrentlyAssigned ? 'active-candidate' : ''}`}
                            onClick={() => !isCurrentlyAssigned && handleReassignCustomer(m.id, cand.id, cand.name)}
                          >
                            <div className="candidate-card-header">
                              <CustomerAvatar
                                customerId={cand.id}
                                name={cand.name}
                                hasPhoto={cand.hasPhoto}
                                size="md"
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>
                                    Candidate {String.fromCharCode(65 + cIdx)}: {cand.name}
                                  </strong>
                                  {isCurrentlyAssigned && (
                                    <span className="badge badge-cobalt" style={{ fontSize: '10px' }}>
                                      Selected
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                                  Phone: {formatPhoneEnding(cand.phone)}
                                </div>
                                {cand.address && (
                                  <div style={{ fontSize: '11.5px', color: 'var(--muted-light)' }}>
                                    {cand.address}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Candidate Aliases & Notes */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                              {cand.aliases && cand.aliases.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Alias:</span>
                                  {cand.aliases.map((al, aIdx) => (
                                    <span key={aIdx} className="alias-tag" style={{ fontSize: '10px', padding: '1px 5px' }}>
                                      {al}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {cand.notes && (
                                <div style={{ fontSize: '11.5px', color: 'var(--ink-light)', fontStyle: 'italic' }}>
                                  Note: {cand.notes}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Udhaar Balance:</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: (cand.outstandingBalance || 0) > 0 ? '#B26E12' : 'var(--emerald)', fontSize: '12.5px' }}>
                                  {formatINR(cand.outstandingBalance)}
                                </span>
                              </div>
                            </div>

                            {/* Candidate Actions */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              {!isCurrentlyAssigned ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReassignCustomer(m.id, cand.id, cand.name);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ flex: 1, justifyContent: 'center' }}
                                  disabled={isActing}
                                >
                                  Select This Customer
                                </button>
                              ) : (
                                <div
                                  style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    fontSize: '11.5px',
                                    color: 'var(--cobalt)',
                                    fontWeight: '600',
                                    padding: '4px',
                                  }}
                                >
                                  ✓ Assigned to this record
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedCustomer(cand);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px' }}
                                title="Inspect identity profile"
                              >
                                <Info size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BOTTOM: Evidence & Reasoning + Verification Action Buttons */}
                <div className="evidence-card">
                  <div className="evidence-items-row">
                    <div className="evidence-pill">
                      <Sparkles size={14} color="var(--amber)" />
                      <span><strong>Reasoning:</strong> {m.reason || 'Amount and party match computed by fuzzy resolution.'}</span>
                    </div>

                    <div className="evidence-pill">
                      <Calendar size={13} color="var(--muted)" />
                      <span>Credit: {m.creditDate} ↔ Payment: {m.paymentDate}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <Link
                      to={`/customers/${m.customerId}/ledger`}
                      className="btn btn-secondary btn-sm"
                      title="Inspect full customer ledger"
                    >
                      <ExternalLink size={13} />
                      <span>Ledger</span>
                    </Link>

                    <button
                      onClick={() => handleReject(m.id)}
                      className="btn btn-danger-ghost btn-sm"
                      disabled={isActing}
                      title="Reject or mark record unresolved"
                    >
                      <X size={14} />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleVerify(m.id)}
                      className="btn btn-emerald btn-sm"
                      disabled={isActing}
                      title="Verify and allocate funds"
                    >
                      <Check size={14} />
                      <span>{isActing ? 'Allocating...' : 'Confirm Match'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT TABLE ALTERNATIVE */
        <div className="paper-box" style={{ overflow: 'hidden' }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Customer Identity</th>
                <th>Credit (Udhaar)</th>
                <th>Payment Received</th>
                <th style={{ textAlign: 'right' }}>Matched Amount</th>
                <th>AI Confidence</th>
                <th>Evidence & Disambiguation</th>
                <th style={{ textAlign: 'right' }}>Review Decision</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const confidencePercent = m.confidence ? Math.round(Number(m.confidence) * 100) : null;
                const isActing = actionLoadingId === m.id;

                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CustomerAvatar
                          customerId={m.customerId}
                          name={m.customerName}
                          hasPhoto={m.customerHasPhoto}
                          size="sm"
                        />
                        <div>
                          <Link
                            to={`/customers/${m.customerId}/ledger`}
                            style={{ fontWeight: '700', color: 'var(--ink)', textDecoration: 'none' }}
                          >
                            {m.customerName}
                          </Link>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {m.customerPhone || 'No phone'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#B26E12' }}>
                          {formatINR(m.creditAmount)}
                        </span>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                          {m.creditDate}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--emerald)' }}>
                          {formatINR(m.paymentAmount)}
                        </span>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                          {m.paymentDate} • {m.paymentReference || 'Ref'}
                        </div>
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--ink)' }}>
                        {formatINR(m.matchedAmount)}
                      </strong>
                    </td>

                    <td>
                      {confidencePercent !== null ? (
                        <span className={`badge ${confidencePercent >= 80 ? 'badge-emerald' : 'badge-amber'}`}>
                          {confidencePercent}% Match
                        </span>
                      ) : (
                        <span className="badge badge-neutral">Auto</span>
                      )}
                    </td>

                    <td style={{ maxWidth: '260px', fontSize: '12.5px', color: 'var(--muted)' }}>
                      <div>{m.reason || 'AI compatibility match'}</div>
                      {m.candidateCustomers && m.candidateCustomers.length > 1 && (
                        <div style={{ fontSize: '11px', color: 'var(--cobalt)', fontWeight: '600', marginTop: '2px' }}>
                          {m.candidateCustomers.length} candidate parties identified
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleVerify(m.id)}
                          className="btn btn-emerald btn-sm"
                          disabled={isActing}
                        >
                          <Check size={13} />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleReject(m.id)}
                          className="btn btn-danger-ghost btn-sm"
                          disabled={isActing}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: INSPECT CANDIDATE CUSTOMER IDENTITY PROFILE */}
      {inspectedCustomer && (
        <div className="modal-backdrop" onClick={() => setInspectedCustomer(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="var(--cobalt)" />
                <h3 className="modal-title">Candidate Identity Profile</h3>
              </div>
              <button onClick={() => setInspectedCustomer(null)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: 'var(--paper-warm)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <CustomerAvatar
                  customerId={inspectedCustomer.id}
                  name={inspectedCustomer.name}
                  hasPhoto={inspectedCustomer.hasPhoto}
                  size="xl"
                />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ink)', margin: 0 }}>
                    {inspectedCustomer.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                    Phone: {inspectedCustomer.phone || 'No phone'}
                  </div>
                  {inspectedCustomer.address && (
                    <div style={{ fontSize: '12px', color: 'var(--muted-light)', marginTop: '2px' }}>
                      Locality: {inspectedCustomer.address}
                    </div>
                  )}
                </div>
              </div>

              {inspectedCustomer.notes && (
                <div style={{ padding: '10px 14px', background: 'var(--paper-inset)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Identifying Notes
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink)', marginTop: '2px' }}>
                    {inspectedCustomer.notes}
                  </div>
                </div>
              )}

              {inspectedCustomer.aliases && inspectedCustomer.aliases.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Registered Aliases
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {inspectedCustomer.aliases.map((al, idx) => (
                      <span key={idx} className="alias-tag">
                        {al}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--paper-warm)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Current Udhaar Balance:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: (inspectedCustomer.outstandingBalance || 0) > 0 ? '#B26E12' : 'var(--emerald)' }}>
                  {formatINR(inspectedCustomer.outstandingBalance)}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setInspectedCustomer(null)} className="btn btn-secondary">
                Close
              </button>
              <Link to={`/customers/${inspectedCustomer.id}/ledger`} className="btn btn-dark">
                <BookOpen size={14} />
                <span>Open Ledger</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationReview;
