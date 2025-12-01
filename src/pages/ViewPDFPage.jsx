// src/pages/ViewPDFPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
  FiUploadCloud
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:8000';

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

const PDFViewerModal = ({ doc, onClose, token }) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (!doc) return null;

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Fetch PDF blob with auth header
  useEffect(() => {
    let isMounted = true;
    const fetchPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/documents/${doc.id}/download`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar o documento.');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setPdfBlobUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading PDF:', err);
          setError('Não foi possível carregar o visualizador.');
          setLoading(false);
        }
      }
    };

    if (doc && token) {
      fetchPdf();
    }

    return () => {
      isMounted = false;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [doc, token]);

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
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
              <FiLoader className="loading-spinner" style={{ fontSize: '3rem', marginBottom: '1rem' }} />
              <p>Carregando documento...</p>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ff6b6b' }}>
              <FiAlertTriangle style={{ fontSize: '3rem', marginBottom: '1rem' }} />
              <p>{error}</p>
            </div>
          ) : (
            <iframe
              src={pdfBlobUrl}
              title={doc.filename}
              className="pdf-iframe"
              type="application/pdf"
            />
          )}
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

const DocumentCard = ({ doc, onView, onDownload, onDelete }) => {
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
        <h4 className="document-title" title={doc.filename}>{doc.filename}</h4>
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

const DocumentListRow = ({ doc, onView, onDownload, onDelete }) => {
  return (
    <div className="document-list-row">
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
        <button className="list-action-btn" onClick={() => onView(doc)} title="Visualizar"><FiEye /></button>
        <button className="list-action-btn" onClick={() => onDownload(doc)} title="Baixar"><FiDownload /></button>
        <button className="list-action-btn delete" onClick={() => onDelete(doc)} title="Excluir"><FiTrash2 /></button>
      </div>
    </div>
  );
};

// --- Main Page Component ---

const ViewPDFPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { token } = useAuth();

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!token) throw new Error('Autenticação necessária');

      // Use Core API endpoint
      const response = await fetch(`${API_BASE_URL}/documents?limit=100&offset=0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        const transformedDocs = data.map(doc => ({
          id: doc._id,
          filename: doc.filename,
          uploadedDate: doc.uploaded_date,
          fileSize: doc.file_size,
          extractionStatus: doc.extraction_status || 'pending',
          extractedImageCount: doc.extracted_image_count || 0
        }));
        setDocuments(transformedDocs);
      } else {
        throw new Error('Formato de resposta inválido da API');
      }

    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

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

  // Actions
  const handleDelete = async (doc) => {
    if (!window.confirm(`Tem certeza que deseja deletar "${doc.filename}"?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Falha ao deletar');

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      // alert('Documento deletado com sucesso!'); // Optional: toast notification better
    } catch (err) {
      alert(`Erro ao deletar: ${err.message}`);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${doc.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Falha no download');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Erro ao baixar: ${err.message}`);
    }
  };

  const handleUploadClick = () => {
    alert("Use o menu lateral para acessar a página de Upload.");
  };

  return (
    <div className="view-pdf-container">
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

            <div className="view-toggle">
              <button
                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Visualização em Grade"
              >
                <FiGrid />
              </button>
              <button
                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Visualização em Lista"
              >
                <FiList />
              </button>
            </div>

            <button className="refresh-btn" onClick={fetchDocuments} title="Atualizar">
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'documents-grid' : 'documents-list'}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="empty-state">
          <FiAlertTriangle className="empty-icon" style={{ color: '#ff6b6b' }} />
          <h3>Erro ao carregar</h3>
          <p>{error}</p>
          <button className="upload-link-btn" onClick={fetchDocuments}>Tentar Novamente</button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <EmptyState isSearch={!!searchQuery} onUploadClick={handleUploadClick} />
      ) : (
        <div className={viewMode === 'grid' ? 'documents-grid' : 'documents-list'}>
          {viewMode === 'grid' ? (
            filteredDocuments.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onView={setSelectedDoc}
                onDownload={handleDownload}
                onDelete={handleDelete}
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
                  onView={setSelectedDoc}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* PDF Viewer Modal */}
      {selectedDoc && (
        <PDFViewerModal
          doc={selectedDoc}
          token={token}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
};

export default ViewPDFPage;
