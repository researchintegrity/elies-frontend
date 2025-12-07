// src/pages/ViewPDFPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  <div className="bg-bg-card dark:bg-dark-card rounded-xl overflow-hidden h-80 border border-gray-700">
    <div className="w-full aspect-[4/3] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-shimmer bg-[length:200%_100%]"></div>
    <div className="p-5">
      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded mb-2"></div>
      <div className="h-4 w-3/5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
    </div>
  </div>
);

const EmptyState = ({ isSearch, onUploadClick }) => (
  <div className="col-span-full flex flex-col items-center justify-center px-8 py-16 text-center text-text-secondary bg-bg-card dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
    <FiFileText className="text-6xl mb-6 text-text-secondary opacity-50" />
    <h3 className="text-2xl mb-2 text-text-primary dark:text-white">{isSearch ? 'Nenhum documento encontrado' : 'Nenhum PDF enviado'}</h3>
    <p className="max-w-md mb-8">
      {isSearch
        ? 'Tente buscar com outros termos ou limpe os filtros.'
        : 'Você ainda não enviou nenhum documento PDF para a plataforma.'}
    </p>
    {!isSearch && (
      <button className="inline-flex items-center gap-2 px-6 py-3 bg-toggle-accent text-white rounded-lg font-medium transition-colors hover:bg-[#7a52c3] border-none cursor-pointer" onClick={onUploadClick}>
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
    <div className="relative flex-shrink-0" ref={menuRef} onClick={e => e.stopPropagation()}>
      <button
        className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center cursor-pointer transition-all text-[1.05rem] border-[1.5px] ${isOpen
          ? 'bg-[#F59E0B] text-black border-[#F59E0B] shadow-[0_2px_12px_rgba(245,158,11,0.4)]'
          : 'bg-[rgba(245,158,11,0.2)] border-[rgba(245,158,11,0.5)] text-[#F59E0B] hover:bg-[rgba(245,158,11,0.35)] hover:border-[#F59E0B] hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(245,158,11,0.3)]'
          }`}
        onClick={() => setIsOpen(!isOpen)}
        title="Opções de Marca d'água"
      >
        <FiDroplet />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+10px)] right-0 bg-bg-card dark:bg-dark-card border-[1.5px] border-gray-700 rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.5),0_4px_12px_rgba(245,158,11,0.15),0_0_0_1px_rgba(255,255,255,0.05)] px-2 py-2 min-w-[270px] max-w-[320px] z-[9999] animate-[fadeIn_0.2s_ease] backdrop-blur-[10px]">
          <div className="text-xs text-[#F59E0B] px-3 py-3 uppercase font-bold tracking-wide border-b-2 border-gray-700 mb-2 flex items-center justify-center gap-2.5">
            <FiDroplet />
            <span>Remover Marca d'Água</span>
          </div>

          <button
            className="flex items-center gap-4 w-full bg-transparent border border-transparent px-4 py-4 text-white text-left rounded-lg cursor-pointer transition-all mb-2 hover:bg-white/10 hover:border-white/15 hover:translate-x-1"
            onClick={() => { onRemoveWatermark(doc, 0); setIsOpen(false); }}
          >
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0 bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-[0_2px_8px_rgba(107,114,128,0.3)] text-lg">—</span>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[0.95rem] font-semibold text-white leading-tight">Nenhum</span>
              <span className="text-xs text-text-secondary font-normal">Manter original</span>
            </div>
          </button>

          <button
            className="flex items-center gap-4 w-full bg-transparent border border-transparent px-4 py-4 text-white text-left rounded-lg cursor-pointer transition-all mb-2 hover:bg-white/10 hover:border-white/15 hover:translate-x-1"
            onClick={() => { onRemoveWatermark(doc, 1); setIsOpen(false); }}
          >
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]">1</span>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[0.95rem] font-semibold text-white leading-tight">Nível 1</span>
              <span className="text-xs text-text-secondary font-normal">Remoção leve</span>
            </div>
          </button>

          <button
            className="flex items-center gap-4 w-full bg-transparent border border-transparent px-4 py-4 text-white text-left rounded-lg cursor-pointer transition-all mb-2 hover:bg-white/10 hover:border-white/15 hover:translate-x-1"
            onClick={() => { onRemoveWatermark(doc, 2); setIsOpen(false); }}
          >
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-600 text-black shadow-[0_2px_8px_rgba(245,158,11,0.3)]">2</span>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[0.95rem] font-semibold text-white leading-tight">Nível 2</span>
              <span className="text-xs text-text-secondary font-normal">Remoção média</span>
            </div>
          </button>

          <button
            className="flex items-center gap-4 w-full bg-transparent border border-transparent px-4 py-4 text-white text-left rounded-lg cursor-pointer transition-all mb-0 hover:bg-white/10 hover:border-white/15 hover:translate-x-1"
            onClick={() => { onRemoveWatermark(doc, 3); setIsOpen(false); }}
          >
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)]">3</span>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[0.95rem] font-semibold text-white leading-tight">Nível 3</span>
              <span className="text-xs text-text-secondary font-normal">Remoção agressiva</span>
            </div>
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
      <div className="flex flex-col items-center justify-center h-full w-full text-text-secondary gap-4">
        <FiLoader className="text-3xl animate-spin text-[#3498db]" />
        <p>Carregando documento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-text-secondary gap-4">
        <FiAlertTriangle className="text-5xl text-[#e74c3c]" />
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] backdrop-blur-sm animate-[fadeIn_0.3s_ease]" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative w-[95vw] h-[95vh] max-w-[1600px] bg-bg-card dark:bg-dark-card rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <button
          className="absolute top-6 right-6 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border-none w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all z-50 text-2xl shadow-lg hover:scale-110"
          onClick={onClose}
          aria-label="Fechar visualização"
        >
          <FiX />
        </button>

        <div className="flex-1 overflow-hidden p-8">
          <PDFPanel doc={doc} />
        </div>

        <div className="px-8 py-6 border-t border-gray-700 bg-bg-deep dark:bg-dark-deep">
          <div className="text-lg font-semibold text-white mb-1">{doc.filename}</div>
          <div className="text-sm text-text-secondary">
            {new Date(doc.uploadedDate).toLocaleDateString()} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentCard = ({ doc, onView, onDownload, onDelete, onRemoveWatermark }) => {
  return (
    <div className="bg-bg-card dark:bg-dark-card border border-gray-700 rounded-xl overflow-visible transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col cursor-pointer hover:-translate-y-1.5 hover:border-[#6366f1] hover:shadow-[0_12px_28px_rgba(0,0,0,0.25),0_0_0_1px_rgba(99,102,241,0.1)]">
      <div className="relative w-full pt-[70%] bg-gradient-to-br from-[#1a1a1a] to-[#252525] flex items-center justify-center border-b border-gray-700 overflow-hidden" onClick={() => onView(doc)}>
        <FiFileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[3.5rem] text-text-secondary opacity-40 transition-all duration-300 hover:opacity-60 hover:scale-110 hover:text-[#6366f1]" />
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center gap-3 opacity-0 transition-opacity duration-250 backdrop-blur-sm group-hover:opacity-100 hover:opacity-100">
          <button className="bg-white/15 border border-white/25 backdrop-blur-[10px] text-white w-[42px] h-[42px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 text-lg hover:scale-[1.15] hover:bg-[#6366f1] hover:border-[#6366f1] hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]" onClick={(e) => { e.stopPropagation(); onView(doc); }} title="Visualizar">
            <FiEye />
          </button>
          <button className="bg-white/15 border border-white/25 backdrop-blur-[10px] text-white w-[42px] h-[42px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 text-lg hover:scale-[1.15] hover:bg-[#10B981] hover:border-[#10B981] hover:shadow-[0_4px_12px_rgba(16,185,129,0.4)]" onClick={(e) => { e.stopPropagation(); onDownload(doc); }} title="Baixar">
            <FiDownload />
          </button>
          <button className="bg-white/15 border border-white/25 backdrop-blur-[10px] text-white w-[42px] h-[42px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 text-lg hover:scale-[1.15] hover:bg-[#EF4444] hover:border-[#EF4444] hover:shadow-[0_4px_12px_rgba(239,68,68,0.4)]" onClick={(e) => { e.stopPropagation(); onDelete(doc); }} title="Excluir">
            <FiTrash2 />
          </button>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-3 overflow-visible">
        <div className="flex justify-between items-start gap-3 overflow-visible">
          <h4 className="text-base text-white m-0 font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-1 leading-relaxed max-w-[calc(100%-40px)] pr-2" title={doc.filename}>{doc.filename}</h4>
          <WatermarkActionMenu doc={doc} onRemoveWatermark={onRemoveWatermark} />
        </div>
        <div className="flex justify-between text-[0.85rem] text-text-secondary gap-4">
          <span>{new Date(doc.uploadedDate).toLocaleDateString()}</span>
          <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
        </div>
        <div className="mt-auto">
          <span className={`text-[0.7rem] px-3 py-1.5 rounded-md uppercase font-bold tracking-wide inline-block ${doc.extractionStatus === 'completed' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' :
            doc.extractionStatus === 'processing' ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30' :
              'bg-amber-500/15 text-amber-500 border border-amber-500/30'
            }`}>
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
    <div className={`grid grid-cols-[48px_2fr_140px_110px_130px_160px] px-5 py-4 border-b border-gray-700 items-center transition-all duration-200 cursor-pointer hover:bg-white/5 ${isActive ? 'bg-[rgba(99,102,241,0.12)] border-l-4 border-l-[#6366f1] pl-[calc(1.25rem-4px)]' : ''
      }`}>
      <div className="text-2xl text-text-secondary flex items-center justify-center transition-colors hover:text-[#6366f1]" onClick={() => onView(doc)}>
        <FiFileText />
      </div>
      <div className="whitespace-nowrap overflow-hidden text-ellipsis pr-4" onClick={() => onView(doc)}>
        <span className="text-white font-semibold text-[0.95rem]" title={doc.filename}>{doc.filename}</span>
      </div>
      <div className="text-text-secondary text-sm font-medium">
        {new Date(doc.uploadedDate).toLocaleDateString()}
      </div>
      <div className="text-text-secondary text-sm font-medium">
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
    <div className="w-full h-full flex flex-col p-8 overflow-hidden relative bg-bg-main animate-[fadeIn_0.4s_ease-in-out]">
      {/* Header & Toolbar */}
      <header className="flex justify-between items-center mb-8 flex-wrap gap-6 pb-4 border-b border-gray-700">
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="text-[1.75rem] font-bold text-white m-0 tracking-tight">Meus Documentos</h2>
            <span className="text-sm text-text-secondary font-medium">
              {loading ? 'Carregando...' : `${filteredDocuments.length} documentos encontrados`}
            </span>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap items-center">
          <div className="relative flex items-center bg-bg-card border border-gray-700 rounded-[10px] px-4 min-w-[280px] transition-all duration-250 focus-within:border-[#6366f1] focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]">
            <FiSearch className="text-text-secondary text-lg flex-shrink-0 mr-3" />
            <input
              type="text"
              className="bg-transparent border-none text-white py-3 w-full outline-none text-[0.95rem] placeholder:text-text-secondary"
              placeholder="Buscar documentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-3 items-center">
            <select
              className="bg-bg-card text-white border border-gray-700 px-4 py-3 pr-10 rounded-[10px] outline-none cursor-pointer text-[0.95rem] font-medium transition-all duration-200 appearance-none hover:border-[#6366f1] focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
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
              className={`bg-transparent border-none px-3 py-2 rounded-md cursor-pointer flex items-center justify-center transition-all duration-200 text-lg ${isSplitView ? 'bg-[#6366f1] text-white shadow-[0_2px_4px_rgba(99,102,241,0.3)]' : 'text-text-secondary hover:bg-white/10 hover:text-white'
                }`}
              onClick={() => setIsSplitView(!isSplitView)}
              title="Visualização Dividida"
            >
              <FiColumns />
            </button>

            <div className="w-px bg-gray-700 h-7"></div>

            <div className="flex bg-bg-card border border-gray-700 rounded-[10px] p-1 gap-1">
              <button
                className={`bg-transparent border-none px-3 py-2 rounded-md cursor-pointer flex items-center justify-center transition-all duration-200 text-lg ${viewMode === 'grid' && !isSplitView ? 'bg-[#6366f1] text-white shadow-[0_2px_4px_rgba(99,102,241,0.3)]' : 'text-text-secondary hover:bg-white/10 hover:text-white'
                  } ${isSplitView ? 'opacity-40 cursor-not-allowed' : ''}`}
                onClick={() => setViewMode('grid')}
                disabled={isSplitView}
                title="Visualização em Grade"
              >
                <FiGrid />
              </button>
              <button
                className={`bg-transparent border-none px-3 py-2 rounded-md cursor-pointer flex items-center justify-center transition-all duration-200 text-lg ${viewMode === 'list' || isSplitView ? 'bg-[#6366f1] text-white shadow-[0_2px_4px_rgba(99,102,241,0.3)]' : 'text-text-secondary hover:bg-white/10 hover:text-white'
                  }`}
                onClick={() => setViewMode('list')}
                title="Visualização em Lista"
              >
                <FiList />
              </button>
            </div>

            <button className="bg-bg-card border border-gray-700 text-text-secondary px-3 py-2 rounded-md cursor-pointer flex items-center justify-center transition-all duration-200 text-lg hover:text-[#6366f1] hover:border-[#6366f1]" onClick={() => fetchDocuments()} title="Atualizar">
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Handles Split Layout */}
      <div className="flex-1 overflow-hidden relative flex gap-8 min-h-0">

        {/* Left Pane: Listing */}
        <div className={`w-full overflow-y-auto overflow-x-hidden transition-[width] duration-300 pb-8 scrollbar-custom ${isSplitView ? 'w-[380px] min-w-[320px] max-w-[480px] border-r border-gray-700 pr-8 -mr-8 flex-shrink-0' : ''
          }`}>
          {loading ? (
            <div className={viewMode === 'grid' && !isSplitView ? 'grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 w-full' : 'w-full'}>
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="col-span-full flex flex-col items-center justify-center px-8 py-16 text-center text-text-secondary bg-bg-card dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-700">
              <FiAlertTriangle className="text-6xl mb-6 opacity-50" style={{ color: '#ff6b6b' }} />
              <h3 className="text-2xl mb-2 text-white">Erro ao carregar</h3>
              <p className="mb-8">{error}</p>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-toggle-accent text-white rounded-lg font-medium transition-colors hover:bg-[#7a52c3] border-none cursor-pointer" onClick={() => fetchDocuments()}>Tentar Novamente</button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <EmptyState isSearch={!!searchQuery} onUploadClick={handleUploadClick} />
          ) : (
            <div className={viewMode === 'grid' && !isSplitView ? 'grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 w-full' : 'w-full'}>
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
                <div className="bg-bg-card border border-gray-700 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[48px_2fr_140px_110px_130px_160px] px-5 py-4 border-b border-gray-700 bg-white/[0.02] text-text-secondary text-xs uppercase tracking-wide font-bold">
                    <div className="flex items-center justify-center text-xs">Tipo</div>
                    <div className="flex items-center">Nome</div>
                    <div className="flex items-center">Data</div>
                    <div className="flex items-center">Tamanho</div>
                    <div className="flex items-center">Status</div>
                    <div className="flex items-center justify-end">Ações</div>
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
          <div className="flex-1 flex flex-col min-w-0">
            {selectedDoc ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 bg-bg-card">
                  <h4 className="text-white font-semibold text-lg m-0">{selectedDoc.filename}</h4>
                  <div className="flex gap-2 items-center">
                    <WatermarkActionMenu doc={selectedDoc} onRemoveWatermark={handleRemoveWatermark} />
                    <button className="bg-transparent border-none text-text-secondary text-2xl cursor-pointer transition-colors hover:text-white" onClick={() => setSelectedDoc(null)} title="Fechar"><FiX /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 scrollbar-custom bg-bg-deep dark:bg-dark-deep">
                  <PDFPanel doc={selectedDoc} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-4">
                <FiFileText className="text-6xl opacity-30" />
                <p className="text-lg">Selecione um documento para visualizar</p>
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
