// src/pages/ViewPDFPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './ViewPDFPage.css';
import {
  FiLoader,
  FiAlertTriangle,
  FiRefreshCw,
  FiDownload,
  FiTrash2,
  FiSearch,
  FiGrid,
  FiList,
  FiFileText,
  FiEye,
  FiX,
  FiUploadCloud,
  FiColumns,
  FiMoreVertical,
  FiDroplet
} from 'react-icons/fi';
import { useDocuments } from '../hooks/useDocuments';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';
import PDFViewer from '../components/PDFViewer';

// --- Components ---

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-preview"></div>
    <div className="skeleton-content">
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text short"></div>
    </div>
  </div>
);

const EmptyState = ({ isSearch, onUploadClick }) => (
  <div className="empty-state">
    <FiFileText className="empty-icon" />
    <h3>{isSearch ? 'Nenhum documento encontrado' : 'Nenhum PDF enviado'}</h3>
    <p>
      {isSearch
        ? 'Tente buscar com outros termos ou limpe os filtros.'
        : 'Você ainda não enviou nenhum documento PDF para a plataforma.'}
    </p>
    {!isSearch && (
      <button className="upload-link-btn" onClick={onUploadClick}>
        <FiUploadCloud /> Fazer Upload Agora
      </button>
    )}
  </div>
);

// --- Watermark Actions Component ---
const WatermarkActionMenu = ({ doc, onRemoveWatermark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="watermark-action-wrapper" ref={menuRef} onClick={e => e.stopPropagation()}>
      <button
        className={`action-btn watermark-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Opções de Marca d'água"
      >
        <FiDroplet />
      </button>

      {isOpen && (
        <div className="watermark-dropdown">
          <div className="dropdown-header">Remover Marca d'água</div>
          <button className="dropdown-item" onClick={() => { onRemoveWatermark(doc, 1); setIsOpen(false); }}>
            <span className="level-badge level-1">1</span> Leve (Apenas IDs)
          </button>
          <button className="dropdown-item" onClick={() => { onRemoveWatermark(doc, 2); setIsOpen(false); }}>
            <span className="level-badge level-2">2</span> Médio (Texto + Gráficos)
          </button>
          <button className="dropdown-item" onClick={() => { onRemoveWatermark(doc, 3); setIsOpen(false); }}>
            <span className="level-badge level-3">3</span> Agressivo (Tudo)
          </button>
        </div>
      )}
    </div>
  );
};

// --- Reusable PDF Content Loader ---
const PDFPanel = ({ doc }) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setPdfBlobUrl(null);

        const blob = await api.download(`/documents/${doc.id}/download`);
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setPdfBlobUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading PDF:', err);
          setError('Não foi possível carregar o documento.');
          setLoading(false);
        }
      }
    };

    if (doc) {
      fetchPdf();
    }

    return () => {
      isMounted = false;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [doc]);

  if (loading) {
    return (
      <div className="pdf-panel-loading">
        <FiLoader className="loading-spinner" />
        <p>Carregando documento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-panel-error">
        <FiAlertTriangle />
        <p>{error}</p>
      </div>
    );
  }

  return <PDFViewer url={pdfBlobUrl} filename={doc.filename} />;
};

const PDFViewerModal = ({ doc, onClose }) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!doc) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-content pdf-modal-content" onClick={e => e.stopPropagation()}>
        <button
          className="lightbox-close"
          onClick={onClose}
          aria-label="Fechar visualização"
        >
          <FiX />
        </button>

        <div className="pdf-viewer-container">
          <PDFPanel doc={doc} />
        </div>

        <div className="lightbox-caption">
          <div className="lightbox-title">{doc.filename}</div>
          <div className="lightbox-details">
            {new Date(doc.uploadedDate).toLocaleDateString()} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentCard = ({ doc, onView, onDownload, onDelete, onRemoveWatermark }) => {
  return (
    <div className="document-card">
      <div className="card-preview-wrapper" onClick={() => onView(doc)}>
        <FiFileText className="card-preview-icon" />
        <div className="card-overlay">
          <button className="action-btn view-btn" onClick={(e) => { e.stopPropagation(); onView(doc); }} title="Visualizar">
            <FiEye />
          </button>
          <button className="action-btn download-btn" onClick={(e) => { e.stopPropagation(); onDownload(doc); }} title="Baixar">
            <FiDownload />
          </button>
          <button className="action-btn delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(doc); }} title="Excluir">
            <FiTrash2 />
          </button>
        </div>
      </div>
      <div className="document-info">
        <div className="document-header-row">
          <h4 className="document-title" title={doc.filename}>{doc.filename}</h4>
          <WatermarkActionMenu doc={doc} onRemoveWatermark={onRemoveWatermark} />
        </div>
        <div className="document-meta">
          <span>{new Date(doc.uploadedDate).toLocaleDateString()}</span>
          <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
        </div>
        <div className="document-status">
          <span className={`status-badge status-${doc.extractionStatus}`}>
            {doc.extractionStatus === 'completed' ? 'Completo' :
              doc.extractionStatus === 'processing' ? 'Processando' :
                'Aguardando'}
          </span>
        </div>
      </div>
    </div>
  );
};

const DocumentListRow = ({ doc, onView, onDownload, onDelete, onRemoveWatermark, isActive }) => {
  return (
    <div className={`document-list-row ${isActive ? 'active-row' : ''}`}>
      <div className="list-col-icon" onClick={() => onView(doc)}>
        <FiFileText />
      </div>
      <div className="list-col-name" onClick={() => onView(doc)}>
        <span className="list-filename" title={doc.filename}>{doc.filename}</span>
      </div>
      <div className="list-col-date">
        {new Date(doc.uploadedDate).toLocaleDateString()}
      </div>
      <div className="list-col-size">
        {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
      </div>
      <div className="list-col-status">
        <span className={`status-badge status-${doc.extractionStatus}`}>
          {doc.extractionStatus === 'completed' ? 'Completo' :
            doc.extractionStatus === 'processing' ? 'Processando' : 'Aguardando'}
        </span>
      </div>
      <div className="list-col-actions">
        <WatermarkActionMenu doc={doc} onRemoveWatermark={onRemoveWatermark} />
        <button className="list-action-btn" onClick={() => onView(doc)} title="Visualizar"><FiEye /></button>
        <button className="list-action-btn" onClick={() => onDownload(doc)} title="Baixar"><FiDownload /></button>
        <button className="list-action-btn delete" onClick={() => onDelete(doc)} title="Excluir"><FiTrash2 /></button>
      </div>
    </div>
  );
};

// --- Main Page Component ---

const ViewPDFPage = () => {
  // Use Custom Hook
  const {
    documents,
    loading,
    error,
    fetchDocuments,
    deleteDocument,
    downloadDocument
  } = useDocuments();

  // UI State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [isSplitView, setIsSplitView] = useState(false); // Split View Toggle
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Initial Fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle Watermark Actions
  const handleRemoveWatermark = async (doc, aggressivenessMode) => {
    console.log(`Initiating watermark removal for ${doc.filename} (ID: ${doc.id}) with Mode ${aggressivenessMode}`);
    // Check if doc is valid
    if (!doc || !doc.id) {
      showAlert('Erro', 'Documento inválido.', 'error');
      return;
    }

    // Future API Call implementation
    /*
    try {
        await api.post(`/documents/${doc.id}/remove-watermark`, { aggressiveness_mode: aggressivenessMode });
        showAlert('Sucesso', 'Remoção de marca d\'água iniciada.', 'success');
        fetchDocuments(); // Refresh status
    } catch (error) {
        showAlert('Erro', 'Falha ao iniciar remoção.', 'error');
    }
    */
    showAlert('Funcionalidade em Breve', `Remoção de nível ${aggressivenessMode} solicitada para: ${doc.filename}`, 'info');
  };

  // Filter & Sort Logic
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(doc => doc.filename.toLowerCase().includes(query));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.uploadedDate) - new Date(a.uploadedDate);
        case 'oldest': return new Date(a.uploadedDate) - new Date(b.uploadedDate);
        case 'name_asc': return a.filename.localeCompare(b.filename);
        case 'name_desc': return b.filename.localeCompare(a.filename);
        case 'size_desc': return b.fileSize - a.fileSize;
        default: return 0;
      }
    });

    return result;
  }, [documents, searchQuery, sortBy]);

  const handleUploadClick = () => {
    showAlert('Upload', "Use o menu lateral para acessar a página de Upload.", 'info');
  };

  // When clicking a document:
  // - In Split View: Select it (updates right pane)
  // - In Normal View: Open Modal
  const handleDocumentClick = (doc) => {
    setSelectedDoc(doc);
    // If NOT in split view, the Modal renders based on selectedDoc != null
    // If IN split view, the Modal is suppressed and the Split Pane is shown
  };

  const handleCloseModal = () => {
    setSelectedDoc(null);
  };

  return (
    <div className={`view-pdf-container ${isSplitView ? 'split-mode-active' : ''}`}>
      {/* Header & Toolbar */}
      <header className="gallery-header">
        <div className="gallery-title-section">
          <div>
            <h2>Meus Documentos</h2>
            <span className="gallery-stats">
              {loading ? 'Carregando...' : `${filteredDocuments.length} documentos encontrados`}
            </span>
          </div>
        </div>

        <div className="gallery-toolbar">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar documentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="name_asc">Nome (A-Z)</option>
              <option value="name_desc">Nome (Z-A)</option>
              <option value="size_desc">Tamanho (Maior)</option>
            </select>

            {/* Split View Toggle */}
            <button
              className={`toggle-btn ${isSplitView ? 'active' : ''}`}
              onClick={() => setIsSplitView(!isSplitView)}
              title="Visualização Dividida"
            >
              <FiColumns />
            </button>

            <div className="view-toggle-divider"></div>

            <div className="view-toggle">
              <button
                className={`toggle-btn ${viewMode === 'grid' && !isSplitView ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                disabled={isSplitView} // Grid disabled in split view for layout sanity
                title="Visualização em Grade"
              >
                <FiGrid />
              </button>
              <button
                className={`toggle-btn ${viewMode === 'list' || isSplitView ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Visualização em Lista"
              >
                <FiList />
              </button>
            </div>

            <button className="refresh-btn" onClick={() => fetchDocuments()} title="Atualizar">
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Handles Split Layout */}
      <div className="content-area-wrapper">

        {/* Left Pane: Listing */}
        <div className={`documents-pane ${isSplitView ? 'split-pane-left' : ''}`}>
          {loading ? (
            <div className={viewMode === 'grid' && !isSplitView ? 'documents-grid' : 'documents-list'}>
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="empty-state">
              <FiAlertTriangle className="empty-icon" style={{ color: '#ff6b6b' }} />
              <h3>Erro ao carregar</h3>
              <p>{error}</p>
              <button className="upload-link-btn" onClick={() => fetchDocuments()}>Tentar Novamente</button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <EmptyState isSearch={!!searchQuery} onUploadClick={handleUploadClick} />
          ) : (
            <div className={viewMode === 'grid' && !isSplitView ? 'documents-grid' : 'documents-list'}>
              {viewMode === 'grid' && !isSplitView ? (
                filteredDocuments.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onView={handleDocumentClick}
                    onDownload={downloadDocument}
                    onDelete={deleteDocument}
                    onRemoveWatermark={handleRemoveWatermark}
                  />
                ))
              ) : (
                <div className="list-container">
                  <div className="list-header-row">
                    <div className="list-col-icon">Tipo</div>
                    <div className="list-col-name">Nome</div>
                    <div className="list-col-date">Data</div>
                    <div className="list-col-size">Tamanho</div>
                    <div className="list-col-status">Status</div>
                    <div className="list-col-actions">Ações</div>
                  </div>
                  {filteredDocuments.map(doc => (
                    <DocumentListRow
                      key={doc.id}
                      doc={doc}
                      isActive={isSplitView && selectedDoc && selectedDoc.id === doc.id}
                      onView={handleDocumentClick}
                      onDownload={downloadDocument}
                      onDelete={deleteDocument}
                      onRemoveWatermark={handleRemoveWatermark}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Split Viewer */}
        {isSplitView && (
          <div className="split-pane-right">
            {selectedDoc ? (
              <div className="split-viewer-wrapper">
                <div className="split-viewer-header">
                  <h4>{selectedDoc.filename}</h4>
                  <div className="split-viewer-actions">
                    <WatermarkActionMenu doc={selectedDoc} onRemoveWatermark={handleRemoveWatermark} />
                    <button onClick={() => setSelectedDoc(null)} title="Fechar"><FiX /></button>
                  </div>
                </div>
                <div className="split-viewer-body">
                  <PDFPanel doc={selectedDoc} />
                </div>
              </div>
            ) : (
              <div className="split-placeholder">
                <FiFileText />
                <p>Selecione um documento para visualizar</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* PDF Viewer Modal (Only when NOT in Split View) */}
      {!isSplitView && selectedDoc && (
        <PDFViewerModal
          doc={selectedDoc}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default ViewPDFPage;
