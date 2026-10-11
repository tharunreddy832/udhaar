import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import CustomerAvatar from '../components/CustomerAvatar';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit3,
  AlertCircle,
  RefreshCw,
  X,
  UserCheck,
  FileSpreadsheet,
  Clock,
  Check,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  User,
} from 'lucide-react';

export const ImportDetails = () => {
  const { importId } = useParams();
  const [importSource, setImportSource] = useState(null);
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED'

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState('PAYMENT');
  const [editDesc, setEditDesc] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [srcRes, recRes, custRes] = await Promise.all([
        api.get(`/api/imports/${importId}`),
        api.get(`/api/imports/${importId}/records`),
        api.get('/api/customers'),
      ]);
      setImportSource(srcRes.data);
      setRecords(recRes.data || []);
      setCustomers(custRes.data || []);
    } catch (err) {
      console.error('Error fetching import details:', err);
      setError('Failed to load import details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [importId]);

  const handleOpenApprove = (rec) => {
    setSelectedRecord(rec);
    setSelectedCustomerId(rec.suggestedCustomerId || (customers[0]?.id || ''));
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/imports/records/${selectedRecord.id}/approve`, {
        customerId: selectedCustomerId ? parseInt(selectedCustomerId, 10) : null,
      });
      setShowApproveModal(false);
      setSuccessMsg(`Record confirmed and posted to customer ledger!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (rec) => {
    setSelectedRecord(rec);
    setEditName(rec.extractedName || '');
    setEditAmount(rec.extractedAmount || '');
    setEditDate(rec.extractedDate || '');
    setEditType(rec.recordType || 'PAYMENT');
    setEditDesc(rec.extractedDescription || '');
    setShowEditModal(true);
  };

  const handleConfirmEdit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/api/imports/records/${selectedRecord.id}`, {
        extractedName: editName,
        extractedAmount: parseFloat(editAmount),
        extractedDate: editDate,
        recordType: editType,
        extractedDescription: editDesc,
      });
      setShowEditModal(false);
      setSuccessMsg('Record details updated.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (rec) => {
    if (!window.confirm('Reject and ignore this extracted entry?')) return;
    setError('');
    try {
      await api.post(`/api/imports/records/${rec.id}/reject`);
      setSuccessMsg('Record rejected.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject record.');
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const filteredRecords = records.filter((r) => {
    if (statusFilter === 'NEEDS_REVIEW') return r.processingStatus === 'NEEDS_REVIEW' || r.processingStatus === 'PENDING';
    if (statusFilter === 'APPROVED') return r.processingStatus === 'APPROVED';
    if (statusFilter === 'REJECTED') return r.processingStatus === 'REJECTED';
    return true;
  });

  const needsReviewCount = records.filter(
    (r) => r.processingStatus === 'NEEDS_REVIEW' || r.processingStatus === 'PENDING'
  ).length;
  const approvedCount = records.filter((r) => r.processingStatus === 'APPROVED').length;

  return (
    <div>
      {/* Back Link */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/imports"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--muted)',
            fontSize: '13.5px',
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Import History</span>
        </Link>
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

      {/* DOCUMENT SUMMARY HEADER */}
      <section className="paper-box" style={{ padding: '24px 28px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="page-title" style={{ fontSize: '22px', marginBottom: 0 }}>
                {importSource?.fileName || 'Statement Document'}
              </h1>
              <span className={`badge ${importSource?.status === 'COMPLETED' ? 'badge-emerald' : 'badge-amber'}`}>
                {importSource?.status || 'PROCESSING'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px', display: 'flex', gap: '14px' }}>
              <span>Format: {importSource?.sourceType}</span>
              <span>•</span>
              <span>Import ID: #{importId}</span>
              <span>•</span>
              <span>Uploaded: {importSource?.createdAt ? new Date(importSource.createdAt).toLocaleString() : '—'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={fetchData} className="btn btn-secondary btn-sm" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <Link to="/reconciliation" className="btn btn-primary btn-sm">
              <Sparkles size={14} />
              <span>Proceed to Reconciliation →</span>
            </Link>
          </div>
        </div>

        {/* Processing Metric Chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Total Extracted
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: '600', color: 'var(--ink)' }}>
              {records.length} records
            </span>
          </div>

          <div style={{ width: '1px', height: '36px', background: 'var(--border)' }} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Needs Review
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: '600', color: '#B26E12' }}>
              {needsReviewCount} records
            </span>
          </div>

          <div style={{ width: '1px', height: '36px', background: 'var(--border)' }} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Approved to Ledger
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: '600', color: 'var(--emerald)' }}>
              {approvedCount} records
            </span>
          </div>
        </div>
      </section>

      {/* STRUCTURED EXTRACTION WORKBENCH TABLE */}
      <section className="paper-box" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--paper-warm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`filter-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            >
              All Records ({records.length})
            </button>
            <button
              onClick={() => setStatusFilter('NEEDS_REVIEW')}
              className={`filter-tab-btn ${statusFilter === 'NEEDS_REVIEW' ? 'active' : ''}`}
            >
              Needs Review ({needsReviewCount})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`filter-tab-btn ${statusFilter === 'APPROVED' ? 'active' : ''}`}
            >
              Approved ({approvedCount})
            </button>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Showing {filteredRecords.length} entries
          </div>
        </div>

        <table className="ledger-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Date</th>
              <th style={{ width: '110px' }}>Type</th>
              <th>Extracted Name & Party Match</th>
              <th style={{ width: '160px' }}>AI Match Confidence</th>
              <th style={{ width: '140px', textAlign: 'right' }}>Amount</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                  Loading extracted records...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '44px', color: 'var(--muted)' }}>
                  No records found matching this status filter.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const isApproved = rec.processingStatus === 'APPROVED';
                const isRejected = rec.processingStatus === 'REJECTED';
                const confidencePercent = rec.confidence ? Math.round(Number(rec.confidence) * 100) : null;
                const isCredit = rec.recordType === 'CREDIT';

                return (
                  <tr key={rec.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      {rec.extractedDate || '—'}
                    </td>

                    <td>
                      <span className={`badge ${isCredit ? 'badge-amber' : 'badge-emerald'}`}>
                        {rec.recordType || 'PAYMENT'}
                      </span>
                    </td>

                    <td>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--ink)' }}>
                          {rec.extractedName || 'Unidentified Party'}
                        </div>
                        {rec.suggestedCustomerName && (
                          <div style={{ fontSize: '12px', color: 'var(--cobalt)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <UserCheck size={12} />
                            <span>Matched to: <strong>{rec.suggestedCustomerName}</strong></span>
                          </div>
                        )}
                        {rec.rawText && (
                          <div style={{ fontSize: '11px', color: 'var(--muted-light)', marginTop: '2px', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Raw: {rec.rawText}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      {confidencePercent !== null ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                            <span style={{ color: 'var(--muted)' }}>Match:</span>
                            <strong style={{ color: confidencePercent >= 80 ? 'var(--emerald)' : '#B26E12' }}>
                              {confidencePercent}%
                            </strong>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${confidencePercent}%`,
                                height: '100%',
                                background: confidencePercent >= 80 ? 'var(--emerald)' : 'var(--amber)',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Manual entry</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '14px',
                          fontWeight: '700',
                          color: isCredit ? '#B26E12' : 'var(--emerald)',
                        }}
                      >
                        {formatINR(rec.extractedAmount)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          isApproved ? 'badge-emerald' : isRejected ? 'badge-danger' : 'badge-amber'
                        }`}
                      >
                        {rec.processingStatus}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {!isApproved && !isRejected ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenApprove(rec)}
                            className="btn btn-emerald btn-sm"
                            title="Confirm party & post to ledger"
                          >
                            <Check size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className="btn btn-secondary btn-sm"
                            title="Edit fields"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleReject(rec)}
                            className="btn btn-danger-ghost btn-sm"
                            title="Reject"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Processed</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* MODAL: APPROVE RECORD */}
      {showApproveModal && selectedRecord && (
        <div className="modal-backdrop" onClick={() => setShowApproveModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm & Post to Ledger</h3>
              <button onClick={() => setShowApproveModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmApprove}>
              <div className="modal-body">
                <div style={{ padding: '14px', background: 'var(--paper-warm)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Extracted Name:</span>
                    <strong>{selectedRecord.extractedName || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Transaction Amount:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatINR(selectedRecord.extractedAmount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Date:</span>
                    <span>{selectedRecord.extractedDate || '—'}</span>
                  </div>
                </div>

                {/* Candidate Customer Disambiguation Cards */}
                {selectedRecord.candidateCustomers && selectedRecord.candidateCustomers.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ink)', marginBottom: '8px' }}>
                      Suggested Candidate Customers (Click to select)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                      {selectedRecord.candidateCustomers.map((cand) => {
                        const isChosen = String(selectedCustomerId) === String(cand.id);
                        return (
                          <div
                            key={cand.id}
                            onClick={() => setSelectedCustomerId(String(cand.id))}
                            style={{
                              border: isChosen ? '2px solid var(--cobalt)' : '1px solid var(--border)',
                              background: isChosen ? 'var(--cobalt-light)' : 'var(--surface)',
                              padding: '10px',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            <CustomerAvatar
                              customerId={cand.id}
                              name={cand.name}
                              hasPhoto={cand.hasPhoto}
                              size="sm"
                            />
                            <div style={{ flex: 1, minWidth: 0, fontSize: '12px' }}>
                              <div style={{ fontWeight: '700', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cand.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                {cand.phone || 'No phone'}
                              </div>
                              {cand.aliases && cand.aliases.length > 0 && (
                                <div style={{ fontSize: '10px', color: 'var(--cobalt)', marginTop: '2px' }}>
                                  Alias: {cand.aliases.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Assign to Customer Account *</label>
                  <select
                    className="form-input"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Party --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowApproveModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-emerald" disabled={actionLoading}>
                  {actionLoading ? 'Posting...' : 'Approve & Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT RECORD */}
      {showEditModal && selectedRecord && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Extracted Record</h3>
              <button onClick={() => setShowEditModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="form-input"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                  >
                    <option value="PAYMENT">PAYMENT (Received)</option>
                    <option value="CREDIT">CREDIT (Udhaar Given)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Note</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
