import React, { useState, useRef } from 'react';
import { extractPdfText, parseResumeSections } from '../utils/resumeParser';

function ResumeInputSection({ value, onChange, apiKey }) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'upload'
  
  // File Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Parsed Resume states
  const [parsedInfo, setParsedInfo] = useState({
    structuredText: '',
    atsScore: 0,
    atsFeedback: '',
    parsedData: null
  });
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef(null);

  // Drag handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndProcessFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      validateAndProcessFile(selectedFile);
    }
  };

  // Validation
  const validateAndProcessFile = (selectedFile) => {
    setError('');
    setSuccess(false);
    
    // Extensible validation to support future formats (e.g. .docx)
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    
    if (fileExtension !== 'pdf') {
      setError('Unsupported file format. Please upload a PDF file (.pdf).');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (selectedFile.size > maxSize) {
      setError('File size exceeds the 10 MB limit. Please upload a smaller file.');
      return;
    }

    setFile(selectedFile);
    processFile(selectedFile);
  };

  // PDF Text Extraction & Parsing Flow
  const processFile = async (selectedFile) => {
    setLoading(true);
    setProgress(10);
    try {
      // 1. Text extraction from PDF
      const extractedText = await extractPdfText(selectedFile, (pct) => {
        // Map 0-100 progress from extraction to 10-60 range
        setProgress(10 + Math.round(pct * 0.5));
      });

      setProgress(70);

      // 2. Parse sections and get ATS details
      const parsingResult = await parseResumeSections(extractedText, apiKey);
      
      setProgress(100);
      setParsedInfo(parsingResult);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'An error occurred during resume parsing.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // Confirm and populate the main form
  const handleAutofill = () => {
    if (parsedInfo.structuredText) {
      onChange(parsedInfo.structuredText);
      setActiveTab('manual');
      // Reset upload states
      setFile(null);
      setSuccess(false);
      setParsedInfo({
        structuredText: '',
        atsScore: 0,
        atsFeedback: '',
        parsedData: null
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleReset = () => {
    setFile(null);
    setSuccess(false);
    setError('');
    setProgress(0);
    setParsedInfo({
      structuredText: '',
      atsScore: 0,
      atsFeedback: '',
      parsedData: null
    });
  };

  // Colors for ATS score
  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  return (
    <div className="resume-input-section-container mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <label className="form-label fw-semibold mb-0">
          <i className="bi bi-file-earmark-text me-2 text-primary"></i>
          Current Resume
        </label>
        
        {/* Toggle/Tabs */}
        <div className="btn-group btn-group-sm" role="group" aria-label="Resume input options">
          <button
            type="button"
            className={`btn btn-outline-primary ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            ✍️ Manual Entry
          </button>
          <button
            type="button"
            className={`btn btn-outline-primary ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📄 Upload PDF
          </button>
        </div>
      </div>

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div>
          <textarea
            name="currentResume"
            id="currentResume"
            className="form-control"
            rows="8"
            placeholder="Paste your current resume content here (optional)..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          ></textarea>
          <div className="form-text">Paste your current resume or use the Upload PDF tab to extract it automatically.</div>
        </div>
      )}

      {/* Upload PDF Tab */}
      {activeTab === 'upload' && (
        <div className="card border-dashed p-4 text-center upload-card-container">
          
          {/* Default Upload State */}
          {!loading && !success && (
            <div
              className={`drag-drop-zone p-4 rounded-3 ${isDragging ? 'bg-light border-primary' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              style={{ cursor: 'pointer', border: '2px dashed #ccc', transition: 'all 0.2s' }}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="d-none"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <i className="bi bi-cloud-arrow-up display-4 text-primary mb-3 d-block"></i>
              <h5 className="mb-2">Drag & Drop your Resume here</h5>
              <p className="text-muted mb-3">or click to browse from your computer</p>
              <span className="badge bg-secondary mb-1">PDF Files Only (.pdf)</span>
              <div className="text-xs text-muted" style={{ fontSize: '0.8rem' }}>Max size: 10 MB</div>
            </div>
          )}

          {/* Loading / Parsing State */}
          {loading && (
            <div className="py-4">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <h5 className="mb-2">Extracting & Parsing Resume...</h5>
              <p className="text-muted mb-3">AI is structuring your resume content</p>
              
              <div className="progress mx-auto" style={{ width: '80%', height: '8px' }}>
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated" 
                  role="progressbar" 
                  style={{ width: `${progress}%` }} 
                  aria-valuenow={progress} 
                  aria-valuemin="0" 
                  aria-valuemax="100"
                ></div>
              </div>
              <span className="text-xs text-muted mt-2 d-block">{progress}% completed</span>
            </div>
          )}

          {/* Success / Parsing Results State */}
          {success && (
            <div className="text-start">
              <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                <div>
                  Successfully parsed <strong>{file?.name}</strong>! Review the results below.
                </div>
              </div>

              {/* ATS Score & Details */}
              <div className="row g-3 mb-4">
                <div className="col-md-4 text-center border-end">
                  <div className="ats-score-badge p-3">
                    <div className="text-muted text-uppercase small fw-bold">ATS Score Estimate</div>
                    <div className={`display-4 fw-bold text-${getScoreColor(parsedInfo.atsScore)} my-2`}>
                      {parsedInfo.atsScore}
                    </div>
                    <div className="progress mx-auto" style={{ height: '6px', maxWidth: '120px' }}>
                      <div 
                        className={`progress-bar bg-${getScoreColor(parsedInfo.atsScore)}`} 
                        role="progressbar" 
                        style={{ width: `${parsedInfo.atsScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="col-md-8 d-flex align-items-center">
                  <div className="ps-2">
                    <h6 className="fw-semibold">AI Analysis Feedback</h6>
                    <p className="text-muted mb-0">{parsedInfo.atsFeedback}</p>
                  </div>
                </div>
              </div>

              {/* Candidate Info Quick Preview */}
              {parsedInfo.parsedData && (
                <div className="bg-light p-3 rounded mb-4">
                  <h6 className="border-bottom pb-2 mb-2 text-primary fw-semibold">
                    <i className="bi bi-person-circle me-2"></i>Candidate Profile Extracted
                  </h6>
                  <div className="row g-2 small">
                    <div className="col-sm-6"><strong>Name:</strong> {parsedInfo.parsedData.fullName || 'Not detected'}</div>
                    <div className="col-sm-6"><strong>Email:</strong> {parsedInfo.parsedData.email || 'Not detected'}</div>
                    <div className="col-sm-6"><strong>Phone:</strong> {parsedInfo.parsedData.phone || 'Not detected'}</div>
                    <div className="col-sm-6"><strong>Location:</strong> {parsedInfo.parsedData.location || 'Not detected'}</div>
                  </div>
                </div>
              )}

              {/* Preview extracted resume accordion */}
              <div className="card mb-4 border-light-subtle shadow-none">
                <div className="card-header bg-light d-flex justify-content-between align-items-center py-2" style={{ cursor: 'pointer' }} onClick={() => setShowPreview(!showPreview)}>
                  <span className="fw-semibold small">
                    <i className="bi bi-eye me-2"></i>Preview Extracted Raw Text
                  </span>
                  <i className={`bi bi-chevron-${showPreview ? 'up' : 'down'} text-muted`}></i>
                </div>
                {showPreview && (
                  <div className="card-body bg-white p-2">
                    <pre className="text-muted small mb-0 p-2 border rounded bg-light" style={{ maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {parsedInfo.structuredText}
                    </pre>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center">
                <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
                  <i className="bi bi-trash me-2"></i>Clear & Upload New
                </button>
                <button type="button" className="btn btn-success" onClick={handleAutofill}>
                  <i className="bi bi-file-earmark-check me-2"></i>Confirm & Autofill Editor
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="py-2">
              <div className="alert alert-danger d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                <div className="text-start">{error}</div>
              </div>
              <button type="button" className="btn btn-primary" onClick={handleReset}>
                <i className="bi bi-arrow-clockwise me-2"></i>Try Again
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default ResumeInputSection;
