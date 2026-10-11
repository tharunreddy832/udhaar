import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import CustomerAvatar from '../components/CustomerAvatar';
import {
  Users,
  UserPlus,
  Search,
  BookOpen,
  Edit3,
  Trash2,
  AlertCircle,
  Phone,
  MapPin,
  X,
  ArrowRight,
  PlusCircle,
  CreditCard,
  CheckCircle2,
  Wallet,
  Calendar,
  ExternalLink,
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  Tag,
  Camera,
  Upload,
  FileText,
  User,
  Plus,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'BALANCE', 'SETTLED', 'ARCHIVED'
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState('CARDS'); // 'CARDS' | 'LIST'
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerLedgerPreview, setCustomerLedgerPreview] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeProfileCustomer, setActiveProfileCustomer] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoVersion, setPhotoVersion] = useState(Date.now());

  // Alias state for Profile modal
  const [profileAliases, setProfileAliases] = useState([]);
  const [newAliasName, setNewAliasName] = useState('');
  const [aliasLoading, setAliasLoading] = useState(false);

  // Transaction states
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');
  const [txRef, setTxRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const fetchCustomers = async (includeArchived = showArchived) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/customers?status=${includeArchived ? 'archived' : 'active'}`);
      const list = res.data || [];
      setCustomers(list);
      if (list.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(showArchived);
  }, [showArchived]);

  // Fetch ledger preview whenever selected customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      setLoadingLedger(true);
      api.get(`/api/customers/${selectedCustomerId}/ledger`)
        .then((res) => setCustomerLedgerPreview(res.data))
        .catch(() => setCustomerLedgerPreview(null))
        .finally(() => setLoadingLedger(false));
    } else {
      setCustomerLedgerPreview(null);
    }
  }, [selectedCustomerId]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0] || null;

  // Clean up object preview URL on unmount/change
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPEG, PNG, or WebP images are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be less than 5 MB.');
      return;
    }

    setPhotoFile(file);
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleOpenAdd = () => {
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (customer) => {
    setName(customer.name);
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setNotes(customer.notes || '');
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowEditModal(true);
  };

  const handleOpenProfile = async (customer) => {
    setActiveProfileCustomer(customer);
    setShowProfileModal(true);
    setNewAliasName('');
    setAliasLoading(true);
    try {
      const res = await api.get(`/api/customers/${customer.id}/aliases`);
      setProfileAliases(res.data || []);
    } catch (err) {
      console.error('Failed to load aliases:', err);
      setProfileAliases([]);
    } finally {
      setAliasLoading(false);
    }
  };

  const handleAddAlias = async (e) => {
    e.preventDefault();
    if (!activeProfileCustomer || !newAliasName.trim()) return;
    setAliasLoading(true);
    try {
      const res = await api.post(`/api/customers/${activeProfileCustomer.id}/aliases`, {
        aliasName: newAliasName.trim(),
      });
      setProfileAliases([...profileAliases, res.data]);
      setNewAliasName('');
      // update local customer aliases list
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === activeProfileCustomer.id
            ? { ...c, aliases: [...(c.aliases || []), res.data.aliasName] }
            : c
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add alias');
    } finally {
      setAliasLoading(false);
    }
  };

  const handleDeleteAlias = async (aliasId, aliasName) => {
    if (!activeProfileCustomer) return;
    try {
      await api.delete(`/api/customers/${activeProfileCustomer.id}/aliases/${aliasId}`);
      setProfileAliases((prev) => prev.filter((a) => a.id !== aliasId));
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === activeProfileCustomer.id
            ? { ...c, aliases: (c.aliases || []).filter((a) => a !== aliasName) }
            : c
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete alias');
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    let createdCustomer = null;
    try {
      const res = await api.post('/api/customers', { name, phone, address, notes });
      createdCustomer = res.data;

      // If user selected a photo, upload it as step 2
      if (photoFile && createdCustomer?.id) {
        try {
          const formData = new FormData();
          formData.append('file', photoFile);
          await api.post(`/api/customers/${createdCustomer.id}/photo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
          alert('Customer created, but photo upload failed: ' + (photoErr.response?.data?.message || photoErr.message));
        }
      }

      setShowAddModal(false);
      setSuccessMsg(`Customer "${createdCustomer.name}" created successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setPhotoVersion(Date.now());
      await fetchCustomers();
      if (createdCustomer?.id) setSelectedCustomerId(createdCustomer.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    const custToEdit = selectedCustomer;
    if (!custToEdit) return;
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/api/customers/${custToEdit.id}`, { name, phone, address, notes });

      // If a replacement photo was chosen
      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        await api.post(`/api/customers/${custToEdit.id}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setShowEditModal(false);
      setSuccessMsg('Customer details updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setPhotoVersion(Date.now());
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePhoto = async (customerId) => {
    if (!window.confirm('Remove this customer profile photo?')) return;
    try {
      await api.delete(`/api/customers/${customerId}/photo`);
      setSuccessMsg('Customer photo removed.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setPhotoVersion(Date.now());
      fetchCustomers();
      if (activeProfileCustomer?.id === customerId) {
        setActiveProfileCustomer((prev) => ({ ...prev, hasPhoto: false }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete photo');
    }
  };

  const handleArchiveCustomer = async (customer) => {
    if (!window.confirm(`Archive "${customer.name}"? They will be hidden from active lists and blocked from new transactions. Their financial history is preserved. You can reactivate them anytime.`)) {
      return;
    }
    setError('');
    try {
      await api.patch(`/api/customers/${customer.id}/archive`);
      setSuccessMsg(`"${customer.name}" has been archived.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      if (!showArchived) {
        setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
        if (selectedCustomerId === customer.id) {
          setSelectedCustomerId(null);
        }
      } else {
        setCustomers((prev) => prev.map((c) => c.id === customer.id ? { ...c, active: false } : c));
      }
      if (showProfileModal && activeProfileCustomer?.id === customer.id) {
        setActiveProfileCustomer((prev) => ({ ...prev, active: false }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to archive customer.');
    }
  };

  const handleReactivateCustomer = async (customer) => {
    setError('');
    try {
      await api.patch(`/api/customers/${customer.id}/reactivate`);
      setSuccessMsg(`"${customer.name}" has been reactivated.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      if (showArchived) {
        setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
        if (selectedCustomerId === customer.id) {
          setSelectedCustomerId(null);
        }
      } else {
        setCustomers((prev) => prev.map((c) => c.id === customer.id ? { ...c, active: true } : c));
      }
      if (showProfileModal && activeProfileCustomer?.id === customer.id) {
        setActiveProfileCustomer((prev) => ({ ...prev, active: true }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reactivate customer.');
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name}? This cannot be undone.`)) {
      return;
    }
    setError('');
    try {
      await api.delete(`/api/customers/${customer.id}`);
      setSuccessMsg(`Customer ${customer.name} deleted.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setSelectedCustomerId(null);
      if (showProfileModal && activeProfileCustomer?.id === customer.id) {
        setShowProfileModal(false);
      }
      fetchCustomers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Cannot delete customer. Ensure no financial transactions exist.';
      setError(msg);
    }
  };

  const handleRecordCredit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      await api.post(`/api/customers/${selectedCustomer.id}/credits`, {
        amount: parseFloat(txAmount),
        entryDate: txDate,
        description: txDesc || 'Credit entry',
        sourceType: 'MANUAL',
      });
      setShowCreditModal(false);
      setTxAmount('');
      setTxDesc('');
      setSuccessMsg(`Credit entry recorded for ${selectedCustomer.name}`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchCustomers();
      if (selectedCustomer.id) {
        const res = await api.get(`/api/customers/${selectedCustomer.id}/ledger`);
        setCustomerLedgerPreview(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record credit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      await api.post(`/api/customers/${selectedCustomer.id}/payments`, {
        amount: parseFloat(txAmount),
        paymentDate: txDate,
        reference: txRef || 'Direct Payment',
        description: txDesc || 'Payment received',
        sourceType: 'MANUAL',
      });
      setShowPaymentModal(false);
      setTxAmount('');
      setTxDesc('');
      setTxRef('');
      setSuccessMsg(`Payment recorded for ${selectedCustomer.name}`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchCustomers();
      if (selectedCustomer.id) {
        const res = await api.get(`/api/customers/${selectedCustomer.id}/ledger`);
        setCustomerLedgerPreview(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q)) ||
      (c.aliases && c.aliases.some((a) => a.toLowerCase().includes(q)));
    if (!matchesSearch) return false;

    if (filterType === 'ARCHIVED') {
      return c.active === false;
    }
    // In non-archived view, only show active customers for BALANCE/SETTLED/ALL
    if (!showArchived && c.active === false) return false;

    if (filterType === 'BALANCE') {
      return (c.outstandingBalance || 0) > 0;
    }
    if (filterType === 'SETTLED') {
      return (c.outstandingBalance || 0) <= 0;
    }
    return true;
  });

  const activeCustomers = customers.filter((c) => c.active !== false);
  const archivedCustomers = customers.filter((c) => c.active === false);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Identity & Ledgers</h1>
          <p className="page-subtitle">
            Visual customer identity profiles, alias resolution, and direct party accounts
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View Mode Switch */}
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
              onClick={() => setViewMode('CARDS')}
              className={`filter-tab-btn ${viewMode === 'CARDS' ? 'active' : ''}`}
              title="Identity Cards View"
            >
              <LayoutGrid size={14} />
              <span>Identity Cards</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`filter-tab-btn ${viewMode === 'LIST' ? 'active' : ''}`}
              title="Interactive Workspace View"
            >
              <ListIcon size={14} />
              <span>Workspace List</span>
            </button>
          </div>

          <button onClick={handleOpenAdd} className="btn btn-primary">
            <UserPlus size={16} />
            <span>New Customer</span>
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

      {/* FILTER & SEARCH STRIP */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        <div className="search-input-box" style={{ maxWidth: '380px', width: '100%' }}>
          <Search size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, phone, alias, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tab-bar">
          <button
            onClick={() => { setFilterType('ALL'); setShowArchived(false); }}
            className={`filter-tab-btn ${filterType === 'ALL' && !showArchived ? 'active' : ''}`}
          >
            All Active ({activeCustomers.length})
          </button>
          <button
            onClick={() => { setFilterType('BALANCE'); setShowArchived(false); }}
            className={`filter-tab-btn ${filterType === 'BALANCE' ? 'active' : ''}`}
          >
            With Udhaar ({activeCustomers.filter((c) => (c.outstandingBalance || 0) > 0).length})
          </button>
          <button
            onClick={() => { setFilterType('SETTLED'); setShowArchived(false); }}
            className={`filter-tab-btn ${filterType === 'SETTLED' ? 'active' : ''}`}
          >
            Settled ({activeCustomers.filter((c) => (c.outstandingBalance || 0) <= 0).length})
          </button>
          <button
            onClick={() => { setFilterType('ARCHIVED'); setShowArchived(true); }}
            className={`filter-tab-btn ${filterType === 'ARCHIVED' ? 'active' : ''}`}
            style={filterType === 'ARCHIVED' ? {} : { color: 'var(--muted)' }}
          >
            <Archive size={12} style={{ marginRight: '4px' }} />
            Archived ({archivedCustomers.length})
          </button>
        </div>
      </div>

      {/* VIEW: IDENTITY CARDS GRID */}
      {viewMode === 'CARDS' ? (
        <div>
          {loading ? (
            <div className="paper-box" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              Loading customer identity cards...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="paper-box" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              No customers match your search criteria.
            </div>
          ) : (
            <div className="identity-cards-grid">
              {filteredCustomers.map((c) => {
                const hasBalance = (c.outstandingBalance || 0) > 0;
                return (
                  <div key={c.id} className="identity-card" style={c.active === false ? { opacity: 0.65 } : {}}>
                    {/* Archived banner */}
                    {c.active === false && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: 'var(--paper-inset)', borderBottom: '1px solid var(--border-subtle)',
                        padding: '5px 12px', fontSize: '11px', color: 'var(--muted)', fontWeight: '600',
                      }}>
                        <Archive size={11} /> ARCHIVED
                      </div>
                    )}
                    {/* Header: Photo Avatar + Primary Details */}
                    <div className="identity-card-header">
                      <CustomerAvatar
                        customerId={c.id}
                        name={c.name}
                        hasPhoto={c.hasPhoto}
                        photoVersion={photoVersion}
                        size="card"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <h3
                            style={{
                              fontSize: '15.5px',
                              fontWeight: '700',
                              color: 'var(--ink)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.name}
                          </h3>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                          <Phone size={12} />
                          <span>{c.phone || 'No phone'}</span>
                        </div>

                        {c.address && (
                          <div style={{ fontSize: '11.5px', color: 'var(--muted-light)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <MapPin size={11} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.address}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Body: Aliases, Notes, Balance Metric */}
                    <div className="identity-card-body">
                      {/* Aliases tag row */}
                      {c.aliases && c.aliases.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          <Tag size={11} color="var(--cobalt)" />
                          <span className="alias-tag" title={`Alias: ${c.aliases[0]}`}>
                            {c.aliases[0]}
                          </span>
                          {c.aliases.length > 1 && (
                            <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: '600' }}>
                              +{c.aliases.length - 1}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Identifying Notes */}
                      {c.notes && (
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--ink-light)',
                            background: 'var(--paper-inset)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            fontStyle: 'italic',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={c.notes}
                        >
                          "{c.notes}"
                        </div>
                      )}

                      {/* Outstanding Balance Strip */}
                      <div
                        style={{
                          marginTop: 'auto',
                          paddingTop: '8px',
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.5px' }}>
                          Udhaar Due
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '16px',
                              fontWeight: '700',
                              color: hasBalance ? '#B26E12' : 'var(--emerald)',
                            }}
                          >
                            {formatINR(c.outstandingBalance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: View Profile & Open Ledger actions */}
                    <div className="identity-card-footer">
                      <button
                        onClick={() => handleOpenProfile(c)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <User size={13} />
                        <span>View Profile</span>
                      </button>

                      {c.active !== false ? (
                        <button
                          onClick={() => handleArchiveCustomer(c)}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, justifyContent: 'center', color: 'var(--muted)' }}
                          title="Archive customer"
                        >
                          <Archive size={13} />
                          <span>Archive</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateCustomer(c)}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, justifyContent: 'center', color: 'var(--emerald)' }}
                          title="Reactivate customer"
                        >
                          <ArchiveRestore size={13} />
                          <span>Reactivate</span>
                        </button>
                      )}

                      <Link
                        to={`/customers/${c.id}/ledger`}
                        className="btn btn-dark btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <BookOpen size={13} />
                        <span>Ledger</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW: INTERACTIVE WORKSPACE LIST (SPLIT VIEW) */
        <div className="customer-workspace-layout">
          {/* Left Column: Customer Directory */}
          <div className="customer-list-panel">
            <div className="customer-scroll-list">
              {loading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  Loading customer directory...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  No customer records match your filter.
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected = selectedCustomer?.id === c.id;
                  const hasBalance = (c.outstandingBalance || 0) > 0;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`customer-list-item ${isSelected ? 'selected' : ''}`}
                    >
                      <CustomerAvatar
                        customerId={c.id}
                        name={c.name}
                        hasPhoto={c.hasPhoto}
                        photoVersion={photoVersion}
                        size="md"
                      />

                      <div className="customer-item-info">
                        <div className="customer-item-name">{c.name}</div>
                        <div className="customer-item-phone">
                          <Phone size={11} />
                          <span>{c.phone || 'No phone'}</span>
                        </div>
                        {c.aliases && c.aliases.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '3px' }}>
                            <span className="alias-tag" style={{ fontSize: '10px', padding: '1px 5px' }}>
                              {c.aliases[0]}
                              {c.aliases.length > 1 ? ` +${c.aliases.length - 1}` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="customer-item-balance">
                        <span className="customer-item-figure" style={{ color: hasBalance ? '#B26E12' : 'var(--emerald)' }}>
                          {formatINR(c.outstandingBalance)}
                        </span>
                        <span className={`badge ${hasBalance ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '10px' }}>
                          {hasBalance ? 'Udhaar Due' : 'Settled'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Customer Details & Workspace Panel */}
          {selectedCustomer ? (
            <div className="customer-detail-panel">
              {/* Identity & Actions Banner */}
              <div className="detail-banner">
                <div className="detail-identity">
                  <CustomerAvatar
                    customerId={selectedCustomer.id}
                    name={selectedCustomer.name}
                    hasPhoto={selectedCustomer.hasPhoto}
                    photoVersion={photoVersion}
                    size="xl"
                  />
                  <div>
                    <h2 className="detail-name">{selectedCustomer.name}</h2>
                    <div className="detail-contact-row">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={13} color="var(--muted)" />
                        {selectedCustomer.phone || 'No phone recorded'}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="var(--muted)" />
                        {selectedCustomer.address || 'No address specified'}
                      </span>
                    </div>

                    {/* Aliases & Notes */}
                    {selectedCustomer.aliases && selectedCustomer.aliases.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>Aliases:</span>
                        {selectedCustomer.aliases.map((al, idx) => (
                          <span key={idx} className="alias-tag">
                            {al}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedCustomer.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--ink-light)', marginTop: '6px', fontStyle: 'italic' }}>
                        Notes: {selectedCustomer.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenProfile(selectedCustomer)}
                    className="btn btn-secondary btn-sm"
                    title="View full identity profile"
                  >
                    <User size={14} />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(selectedCustomer)}
                    className="btn btn-secondary btn-sm"
                    title="Edit customer details"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
                  {selectedCustomer.active !== false ? (
                    <button
                      onClick={() => handleArchiveCustomer(selectedCustomer)}
                      className="btn btn-secondary btn-sm"
                      title="Archive customer"
                      style={{ color: 'var(--muted)' }}
                    >
                      <Archive size={14} />
                      <span>Archive</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivateCustomer(selectedCustomer)}
                      className="btn btn-secondary btn-sm"
                      title="Reactivate customer"
                      style={{ color: 'var(--emerald)' }}
                    >
                      <ArchiveRestore size={14} />
                      <span>Reactivate</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer)}
                    className="btn btn-danger-ghost btn-sm"
                    title="Delete customer (only if no financial history)"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Financial Balance Summary Grid */}
              <div className="detail-balance-grid">
                <div className="detail-balance-card detail-balance-primary">
                  <div>
                    <span className="detail-card-label">Current Outstanding Udhaar</span>
                    <div
                      className="detail-card-figure"
                      style={{ color: (selectedCustomer.outstandingBalance || 0) > 0 ? '#B26E12' : 'var(--emerald)' }}
                    >
                      {formatINR(selectedCustomer.outstandingBalance)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                    {(selectedCustomer.outstandingBalance || 0) > 0
                      ? 'Uncollected balance awaiting payment'
                      : 'All accounts balanced with no outstanding debt'}
                  </div>
                </div>

                <div className="detail-balance-card">
                  <div>
                    <span className="detail-card-label">Total Credit Issued</span>
                    <div className="detail-card-figure" style={{ color: '#B26E12' }}>
                      {formatINR(selectedCustomer.totalCredit)}
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '8px' }}>
                    Cumulative purchases on credit
                  </div>
                </div>

                <div className="detail-balance-card">
                  <div>
                    <span className="detail-card-label">Total Paid Back</span>
                    <div className="detail-card-figure" style={{ color: 'var(--emerald)' }}>
                      {formatINR(selectedCustomer.totalPaid)}
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '8px' }}>
                    Confirmed payments recorded
                  </div>
                </div>
              </div>

              {/* Quick Action Dock */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {selectedCustomer.active !== false ? (
                    <>
                      <button onClick={() => setShowCreditModal(true)} className="btn btn-amber">
                        <PlusCircle size={15} />
                        <span>Record Credit</span>
                      </button>
                      <button onClick={() => setShowPaymentModal(true)} className="btn btn-emerald">
                        <CreditCard size={15} />
                        <span>Record Payment</span>
                      </button>
                    </>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 14px',
                      background: 'var(--paper-warm)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12.5px',
                      color: 'var(--muted)',
                    }}>
                      <Archive size={14} />
                      <span>Customer is archived. Reactivate to record new transactions.</span>
                    </div>
                  )}
                </div>

                <Link
                  to={`/customers/${selectedCustomer.id}/ledger`}
                  className="btn btn-dark"
                  style={{ padding: '9px 18px' }}
                >
                  <BookOpen size={16} />
                  <span>Open Full Ledger & Timeline</span>
                  <ChevronRight size={15} />
                </Link>
              </div>

              {/* Recent Transaction Preview for Selected Customer */}
              <div className="paper-box" style={{ padding: '18px 20px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--ink)' }}>
                    Recent Transactions Preview
                  </h3>
                  <Link
                    to={`/customers/${selectedCustomer.id}/ledger`}
                    style={{ fontSize: '12.5px', color: 'var(--cobalt)', fontWeight: '600' }}
                  >
                    View complete history →
                  </Link>
                </div>

                {loadingLedger ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '12.5px' }}>
                    Loading recent entries...
                  </div>
                ) : customerLedgerPreview?.credits?.length === 0 && customerLedgerPreview?.payments?.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                    No transactions recorded yet for {selectedCustomer.name}.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {customerLedgerPreview?.credits?.slice(0, 3).map((c) => (
                      <div
                        key={`c-${c.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--paper-warm)',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-amber" style={{ fontSize: '10px' }}>Udhaar</span>
                          <span>{c.description || 'Credit purchase'}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '11.5px' }}>• {c.entryDate}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#B26E12' }}>
                          +{formatINR(c.amount)}
                        </span>
                      </div>
                    ))}

                    {customerLedgerPreview?.payments?.slice(0, 3).map((p) => (
                      <div
                        key={`p-${p.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--paper-warm)',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-emerald" style={{ fontSize: '10px' }}>Payment</span>
                          <span>{p.reference || p.description || 'Direct payment'}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '11.5px' }}>• {p.paymentDate}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--emerald)' }}>
                          -{formatINR(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '48px',
                textAlign: 'center',
                color: 'var(--muted)',
              }}
            >
              Select a customer from the left directory to view their financial workspace.
            </div>
          )}
        </div>
      )}

      {/* MODAL: CUSTOMER IDENTITY PROFILE DRAWER / MODAL */}
      {showProfileModal && activeProfileCustomer && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={18} color="var(--cobalt)" />
                <h3 className="modal-title">Customer Identity Profile</h3>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Profile Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '16px',
                  background: 'var(--paper-warm)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <CustomerAvatar
                    customerId={activeProfileCustomer.id}
                    name={activeProfileCustomer.name}
                    hasPhoto={activeProfileCustomer.hasPhoto}
                    photoVersion={photoVersion}
                    size="xl"
                  />
                  {activeProfileCustomer.hasPhoto && (
                    <button
                      onClick={() => handleRemovePhoto(activeProfileCustomer.id)}
                      className="btn btn-danger-ghost btn-sm"
                      style={{
                        position: 'absolute',
                        bottom: '-8px',
                        right: '-8px',
                        padding: '4px',
                        borderRadius: '50%',
                        background: 'white',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                      title="Remove profile photo"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ink)', margin: 0 }}>
                    {activeProfileCustomer.name}
                  </h2>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Phone size={13} />
                    <span>{activeProfileCustomer.phone || 'No phone recorded'}</span>
                  </div>
                  {activeProfileCustomer.address && (
                    <div style={{ fontSize: '12.5px', color: 'var(--muted-light)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={12} />
                      <span>{activeProfileCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Identifying Notes */}
              {activeProfileCustomer.notes && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--paper-inset)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Visual Identification & Notes
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--ink)' }}>
                    {activeProfileCustomer.notes}
                  </p>
                </div>
              )}

              {/* Customer Aliases Management */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Known Aliases & Alternative Names
                  </label>
                  <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                    Helps AI match statement records
                  </span>
                </div>

                {/* Aliases List */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {profileAliases.length === 0 ? (
                    <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontStyle: 'italic' }}>
                      No alternative aliases registered.
                    </span>
                  ) : (
                    profileAliases.map((al) => (
                      <span key={al.id} className="alias-tag alias-tag-removable">
                        <span>{al.aliasName}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAlias(al.id, al.aliasName)}
                          className="alias-remove-btn"
                          title="Remove alias"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Inline Add Alias Form */}
                <form onSubmit={handleAddAlias} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }}
                    placeholder="Add alias (e.g. Ramesh Bhai, Anna)..."
                    value={newAliasName}
                    onChange={(e) => setNewAliasName(e.target.value)}
                    disabled={aliasLoading}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={aliasLoading || !newAliasName.trim()}>
                    <Plus size={14} />
                    <span>Add Alias</span>
                  </button>
                </form>
              </div>

              {/* Financial Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  padding: '14px',
                  background: 'var(--paper-warm)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Outstanding Udhaar
                  </span>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: (activeProfileCustomer.outstandingBalance || 0) > 0 ? '#B26E12' : 'var(--emerald)',
                      marginTop: '2px',
                    }}
                  >
                    {formatINR(activeProfileCustomer.outstandingBalance)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Total Credit
                  </span>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#B26E12',
                      marginTop: '2px',
                    }}
                  >
                    {formatINR(activeProfileCustomer.totalCredit)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Total Paid
                  </span>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: 'var(--emerald)',
                      marginTop: '2px',
                    }}
                  >
                    {formatINR(activeProfileCustomer.totalPaid)}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  handleOpenEdit(activeProfileCustomer);
                }}
                className="btn btn-secondary"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <Link
                  to={`/customers/${activeProfileCustomer.id}/ledger`}
                  className="btn btn-primary"
                >
                  <BookOpen size={14} />
                  <span>Open Full Ledger</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOMER */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Customer Account</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                {/* Photo Selection Dropzone */}
                <div className="form-group">
                  <label className="form-label">Profile Photo (Optional)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {photoPreview ? (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '1px solid var(--border)',
                          flexShrink: 0,
                        }}
                      >
                        <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--paper-warm)',
                          border: '1px dashed var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--muted)',
                          flexShrink: 0,
                        }}
                      >
                        <Camera size={24} />
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        id="new-customer-photo"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handlePhotoSelect}
                      />
                      <label htmlFor="new-customer-photo" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                        <Upload size={14} />
                        <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                      </label>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          className="btn btn-danger-ghost btn-sm"
                          style={{ marginLeft: '8px' }}
                        >
                          Remove
                        </button>
                      )}
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        JPEG, PNG, or WebP (max 5 MB)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. 9812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address / Locality</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    placeholder="e.g. Chandrapuri Colony, Near Market"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Identifying Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Hardware supplier, wears glasses"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CUSTOMER */}
      {showEditModal && selectedCustomer && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Customer: {selectedCustomer.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateCustomer}>
              <div className="modal-body">
                {/* Photo Management */}
                <div className="form-group">
                  <label className="form-label">Identity Photo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {photoPreview ? (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '1px solid var(--border)',
                          flexShrink: 0,
                        }}
                      >
                        <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <CustomerAvatar
                        customerId={selectedCustomer.id}
                        name={selectedCustomer.name}
                        hasPhoto={selectedCustomer.hasPhoto}
                        photoVersion={photoVersion}
                        size="lg"
                      />
                    )}

                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        id="edit-customer-photo"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handlePhotoSelect}
                      />
                      <label htmlFor="edit-customer-photo" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                        <Upload size={14} />
                        <span>{photoPreview || selectedCustomer.hasPhoto ? 'Replace Photo' : 'Upload Photo'}</span>
                      </label>
                      {(photoPreview || selectedCustomer.hasPhoto) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (photoPreview) {
                              setPhotoFile(null);
                              setPhotoPreview(null);
                            } else {
                              handleRemovePhoto(selectedCustomer.id);
                            }
                          }}
                          className="btn btn-danger-ghost btn-sm"
                          style={{ marginLeft: '8px' }}
                        >
                          Remove
                        </button>
                      )}
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                        JPEG, PNG, or WebP (max 5 MB)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address / Locality</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Identifying Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD CREDIT */}
      {showCreditModal && selectedCustomer && (
        <div className="modal-backdrop" onClick={() => setShowCreditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Udhaar: {selectedCustomer.name}</h3>
              <button onClick={() => setShowCreditModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRecordCredit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Credit Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-input"
                    placeholder="500.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Goods Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 5kg Basmati Rice, 2L Oil"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreditModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-amber" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Udhaar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT */}
      {showPaymentModal && selectedCustomer && (
        <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Payment: {selectedCustomer.name}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="form-input"
                    placeholder="500.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reference / Mode</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. UPI Ref / Cash / GPay"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Weekly settlement"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-emerald" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
