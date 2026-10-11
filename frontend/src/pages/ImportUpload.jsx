import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import {
  UploadCloud,
  FileSpreadsheet,
  MessageSquare,
  BookOpen,
  ArrowRight,
  FileCheck2,
  AlertCircle,
  History,
  FileText,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

export const ImportUpload = () => {
  const [file, setFile] = useState(null);
  const [sourceType, setSourceType] = useState('UPI_STATEMENT');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file or drag and drop a document to import.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceType', sourceType);

    try {
      const response = await api.post('/api/imports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const importId = response.data.id;
      navigate(`/imports/${importId}`);
    } catch (err) {
      console.error('Import upload error:', err);
      setError(err.response?.data?.message || 'Failed to process document import.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Intelligent Document Ingestion</h1>
          <p className="page-subtitle">
            Upload banking statements, WhatsApp transaction exports, or ledger scans for AI entity resolution
          </p>
        </div>
        <Link to="/imports" className="btn btn-secondary">
          <History size={15} />
          <span>Import History</span>
        </Link>
      </div>

      {/* 5-STAGE GUIDED WORKFLOW PIPELINE */}
      <div className="guided-import-stepper">
        <div className="import-step-item active">
          <span className="import-step-number">1</span>
          <span className="import-step-label">Import File</span>
        </div>
        <ArrowRight size={14} className="import-step-arrow" />

        <div className="import-step-item">
          <span className="import-step-number">2</span>
          <span className="import-step-label">Extract Records</span>
        </div>
        <ArrowRight size={14} className="import-step-arrow" />

        <div className="import-step-item">
          <span className="import-step-number">3</span>
          <span className="import-step-label">Match Parties</span>
        </div>
        <ArrowRight size={14} className="import-step-arrow" />

        <div className="import-step-item">
          <span className="import-step-number">4</span>
          <span className="import-step-label">Review & Approve</span>
        </div>
        <ArrowRight size={14} className="import-step-arrow" />

        <div className="import-step-item">
          <span className="import-step-number">5</span>
          <span className="import-step-label">Reconcile</span>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* UPLOAD WORKSPACE CARD */}
      <div className="upload-card-wrapper">
        <form onSubmit={handleSubmit}>
          {/* 3 DISTINCT SOURCE OPTIONS */}
          <div style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ marginBottom: '12px', fontSize: '14px' }}>
              Select Source Format
            </label>
            <div className="source-options-grid">
              {/* Option 1: Bank/UPI Statement */}
              <div
                className={`source-card ${sourceType === 'UPI_STATEMENT' ? 'selected' : ''}`}
                onClick={() => setSourceType('UPI_STATEMENT')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <FileSpreadsheet
                    size={24}
                    color={sourceType === 'UPI_STATEMENT' ? 'var(--cobalt)' : 'var(--muted)'}
                  />
                  <input
                    type="radio"
                    name="sourceType"
                    checked={sourceType === 'UPI_STATEMENT'}
                    onChange={() => setSourceType('UPI_STATEMENT')}
                  />
                </div>
                <div>
                  <div className="source-card-title">Bank / UPI Statement</div>
                  <div className="source-card-desc">
                    Google Pay, PhonePe, Paytm, or bank account CSV / TSV / PDF transaction logs.
                  </div>
                </div>
              </div>

              {/* Option 2: Chat or Message Export */}
              <div
                className={`source-card ${sourceType === 'CHAT' ? 'selected' : ''}`}
                onClick={() => setSourceType('CHAT')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <MessageSquare
                    size={24}
                    color={sourceType === 'CHAT' ? 'var(--cobalt)' : 'var(--muted)'}
                  />
                  <input
                    type="radio"
                    name="sourceType"
                    checked={sourceType === 'CHAT'}
                    onChange={() => setSourceType('CHAT')}
                  />
                </div>
                <div>
                  <div className="source-card-title">Chat / Message Export</div>
                  <div className="source-card-desc">
                    WhatsApp text export or customer SMS logs containing payments and orders.
                  </div>
                </div>
              </div>

              {/* Option 3: Ledger Notebook Image */}
              <div
                className={`source-card ${sourceType === 'NOTEBOOK' ? 'selected' : ''}`}
                onClick={() => setSourceType('NOTEBOOK')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <BookOpen
                    size={24}
                    color={sourceType === 'NOTEBOOK' ? 'var(--cobalt)' : 'var(--muted)'}
                  />
                  <input
                    type="radio"
                    name="sourceType"
                    checked={sourceType === 'NOTEBOOK'}
                    onChange={() => setSourceType('NOTEBOOK')}
                  />
                </div>
                <div>
                  <div className="source-card-title">Ledger Notebook Photo</div>
                  <div className="source-card-desc">
                    Physical khata bahi photograph or scanned image for OCR handwriting recognition.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DROPZONE SURFACE */}
          <div
            className="dropzone-box"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept={
                sourceType === 'UPI_STATEMENT'
                  ? '.csv,.tsv,.pdf,.txt'
                  : sourceType === 'CHAT'
                  ? '.txt,.log,.chat'
                  : '.png,.jpg,.jpeg,.webp,.pdf'
              }
            />

            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--paper-inset)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--cobalt)',
              }}
            >
              <UploadCloud size={28} />
            </div>

            {file ? (
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--ink)' }}>
                  Selected: {file.name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  {(file.size / 1024).toFixed(1)} KB • Click to change document
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--ink)' }}>
                  Click to choose file or drag and drop here
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>
                  {sourceType === 'UPI_STATEMENT' && 'Accepts .CSV, .TSV, .PDF up to 25MB'}
                  {sourceType === 'CHAT' && 'Accepts .TXT WhatsApp exported chat logs'}
                  {sourceType === 'NOTEBOOK' && 'Accepts PNG, JPG, JPEG ledger photographs'}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Submit Action */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--muted)' }}>
              <Sparkles size={15} color="var(--amber)" />
              <span>Offline local extraction powered by FastAPI & PyMuPDF</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={uploading || !file}
            >
              <UploadCloud size={18} />
              <span>{uploading ? 'Processing Extraction...' : 'Begin AI Extraction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
