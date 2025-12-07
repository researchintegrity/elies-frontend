// src/pages/ViewPDFPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FiLoader, FiAlertTriangle, FiRefreshCw, FiDownload, FiTrash2,
  FiSearch, FiGrid, FiList, FiFileText, FiEye, FiX,
  FiUploadCloud, FiColumns, FiDroplet, FiCheck
} from 'react-icons/fi';
import { useDocuments } from '../hooks/useDocuments';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';
import PDFViewer from '../components/PDFViewer';

// --- Components ---

const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden h-80 border border-gray-200 dark:border-gray-700 shadow-sm">
    <div className="w-full aspect-[4/3] bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
    <div className="p-5 space-y-3">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
    </div>
  </div>
);

const EmptyState = ({ isSearch, onUploadClick }) => (
  <div className="col-span-full flex flex-col items-center justify-center px-8 py-16 text-center bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
    <FiFileText className="text-6xl mb-6 text-gray-400 dark:text-gray-500" />
    <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
      {isSearch ? 'Nenhum documento encontrado' : 'Nenhum PDF enviado'}
    </h3>
    <p className="max-w-md mb-8 text-gray-600 dark:text-gray-400">
      {isSearch
        ? 'Tente buscar com outros termos ou limpe os filtros.'
        : 'Você ainda não enviou nenhum documento PDF para a plataforma.'}
    </p>
    {!isSearch && (
      <button
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-indigo-500/30"
        onClick={onUploadClick}
      >
        <FiUploadCloud className="text-lg" /> Fazer Upload Agora
      </button>
    )}
  </div>
);

// --- Watermark Actions Component (CORRIGIDO) ---
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
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border ${isOpen
          ? 'bg-amber-100 border-amber-500 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
          : 'bg-transparent border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-amber-500 hover:border-amber-500 dark:hover:text-amber-400'
          }`}
        onClick={() => setIsOpen(!isOpen)}
        title="Opções de Marca d'água"
      >
        <FiDroplet className="text-lg" />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 min-w-[280px] z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-2 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <FiDroplet className="text-amber-500" />
            Remover Marca d'Água
          </div>

          <div className="flex flex-col gap-1">
            {[
              { level: 0, label: 'Nenhum', sub: 'Manter original', color: 'bg-gray-500', icon: '—' },
              { level: 1, label: 'Nível 1', sub: 'Remoção leve', color: 'bg-emerald-500', icon: '1' },
              { level: 2, label: 'Nível 2', sub: 'Remoção média', color: 'bg-amber-500', icon: '2' },
              { level: 3, label: 'Nível 3', sub: 'Remoção agressiva', color: 'bg-red-500', icon: '3' }
            ].map((option) => (
              <button
                key={option.level}
                className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                onClick={() => { onRemoveWatermark(doc, option.level); setIsOpen(false); }}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${option.color}`}>
                  {option.icon}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {option.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {option.sub}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- PDF Panel (Loader/Error Handling) ---
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
    if (doc) fetchPdf();
    return () => {
      isMounted = false;
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [doc]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4 text-gray-500 dark:text-gray-400">
        <FiLoader className="text-4xl animate-spin text-indigo-500" />
        <p className="font-medium">Carregando documento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4 text-red-500">
        <FiAlertTriangle className="text-5xl" />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return <PDFViewer url={pdfBlobUrl} filename={doc.filename} />;
};

// --- Modal ---
const PDFViewerModal = ({ doc, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!doc) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/90 flex items-center justify-center z-[2000] backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full h-full max-w-[1600px] max-h-[95vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{doc.filename}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(doc.uploadedDate).toLocaleDateString()} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          <button
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            onClick={onClose}
          >
            <FiX className="text-2xl" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950">
          <PDFPanel doc={doc} />
        </div>
      </div>
    </div>
  );
};

// --- Card Component ---
// Substitua o componente DocumentCard existente por este:

const DocumentCard = ({ doc, onView, onDownload, onDelete, onRemoveWatermark }) => {
  return (
    // REMOVIDO: overflow-hidden do pai principal
    // ADICIONADO: z-index relativo ao hover para garantir que o card focado fique acima dos vizinhos
    <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-500/50 flex flex-col hover:z-20">

      {/* Preview Area - ONDE O OVERFLOW DEVE FICAR */}
      <div
        className="relative w-full pt-[65%] bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer rounded-t-xl overflow-hidden"
        onClick={() => onView(doc)}
      >
        <FiFileText className="absolute text-6xl text-gray-300 dark:text-gray-700 transition-transform duration-300 group-hover:scale-110 group-hover:text-indigo-400/50" />

        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
          <button className="p-3 rounded-full bg-white/20 hover:bg-indigo-600 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10" onClick={(e) => { e.stopPropagation(); onView(doc); }} title="Visualizar">
            <FiEye className="text-xl" />
          </button>
          <button className="p-3 rounded-full bg-white/20 hover:bg-emerald-600 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10" onClick={(e) => { e.stopPropagation(); onDownload(doc); }} title="Baixar">
            <FiDownload className="text-xl" />
          </button>
          <button className="p-3 rounded-full bg-white/20 hover:bg-red-600 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10" onClick={(e) => { e.stopPropagation(); onDelete(doc); }} title="Excluir">
            <FiTrash2 className="text-xl" />
          </button>
        </div>
      </div>

      {/* Content - AGORA COM OVERFLOW VISÍVEL */}
      <div className="p-4 flex-1 flex flex-col gap-3 relative">
        <div className="flex justify-between items-start gap-3 relative z-10">
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate flex-1" title={doc.filename}>
            {doc.filename}
          </h4>
          {/* O Dropdown vive aqui e agora pode sair do card */}
          <WatermarkActionMenu doc={doc} onRemoveWatermark={onRemoveWatermark} />
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
          <span>{new Date(doc.uploadedDate).toLocaleDateString()}</span>
          <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
        </div>

        <div className="mt-auto pt-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${doc.extractionStatus === 'completed'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
            : doc.extractionStatus === 'processing'
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${doc.extractionStatus === 'completed' ? 'bg-emerald-500' :
              doc.extractionStatus === 'processing' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'
              }`}></span>
            {doc.extractionStatus === 'completed' ? 'Completo' : doc.extractionStatus === 'processing' ? 'Processando' : 'Aguardando'}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- List Row Component ---
// Substitua o componente DocumentListRow por este:

const DocumentListRow = ({ doc, onView, onDownload, onDelete, onRemoveWatermark, isActive, isCompact }) => {
  return (
    <div
      className={`group grid items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer
      ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500 pl-[calc(1rem-4px)]' : 'border-l-4 border-l-transparent'}
      ${/* Lógica de Grid Responsivo */
        isCompact
          ? 'grid-cols-[auto_1fr_auto] gap-3' // Layout Compacto (Split View)
          : 'grid-cols-[48px_2fr_140px_110px_130px_160px] gap-4' // Layout Completo
        }`}
    >
      {/* Coluna 1: Ícone */}
      <div className={`text-gray-400 group-hover:text-indigo-500 flex justify-center ${isCompact ? 'text-xl' : 'text-2xl'}`} onClick={() => onView(doc)}>
        <FiFileText />
      </div>

      {/* Coluna 2: Nome e Info (se compacto) */}
      <div className="truncate pr-2 overflow-hidden" onClick={() => onView(doc)}>
        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate" title={doc.filename}>
          {doc.filename}
        </span>
        {/* Mostra data/tamanho abaixo do nome SOMENTE no modo compacto */}
        {isCompact && (
          <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
            {new Date(doc.uploadedDate).toLocaleDateString()} • {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
          </span>
        )}
      </div>

      {/* Colunas escondidas no modo compacto */}
      {!isCompact && (
        <>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(doc.uploadedDate).toLocaleDateString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
          </div>
          <div>
            <span className={`text-[0.65rem] uppercase font-bold px-2 py-1 rounded border ${doc.extractionStatus === 'completed' ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-transparent' :
              doc.extractionStatus === 'processing' ? 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-500/30 dark:bg-transparent' :
                'text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-500/30 dark:bg-transparent'
              }`}>
              {doc.extractionStatus === 'completed' ? 'Completo' : doc.extractionStatus === 'processing' ? 'Proc...' : 'Aguard...'}
            </span>
          </div>
        </>
      )}

      {/* Coluna Ações: Sempre visível, mas adaptada */}
      <div className={`flex items-center justify-end ${isCompact ? 'gap-1' : 'gap-2 opacity-0 group-hover:opacity-100 transition-opacity'}`}>

        {/* Watermark Action - CRUCIAL: Agora sempre visível */}
        <WatermarkActionMenu doc={doc} onRemoveWatermark={onRemoveWatermark} />

        {/* Outras ações */}
        {!isCompact && (
          <button className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" onClick={() => onView(doc)} title="Visualizar"><FiEye /></button>
        )}

        {/* No modo compacto, mantemos apenas Delete e Download se couber, ou simplificamos */}
        <button className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" onClick={() => onDownload(doc)} title="Baixar"><FiDownload /></button>

        <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" onClick={() => onDelete(doc)} title="Excluir"><FiTrash2 /></button>
      </div>
    </div>
  );
};

// --- Main Page Component ---
const ViewPDFPage = () => {
  const { documents, loading, error, fetchDocuments, deleteDocument, downloadDocument } = useDocuments();
  const [viewMode, setViewMode] = useState('grid');
  const [isSplitView, setIsSplitView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleRemoveWatermark = async (doc, aggressivenessMode) => {
    showAlert('Funcionalidade em Breve', `Remoção de nível ${aggressivenessMode} solicitada para: ${doc.filename}`, 'info');
  };

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

  const handleDocumentClick = (doc) => setSelectedDoc(doc);
  const handleCloseModal = () => setSelectedDoc(null);

  return (
    <div className="w-full h-full flex flex-col p-6 md:p-8 overflow-hidden relative bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">

      {/* Header & Toolbar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">Meus Documentos</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {loading ? 'Carregando...' : `${filteredDocuments.length} documentos encontrados`}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-72 group">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
              placeholder="Buscar documentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <select
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="name_asc">A-Z</option>
              <option value="name_desc">Z-A</option>
              <option value="size_desc">Maior tamanho</option>
            </select>

            <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
              <button
                className={`p-2 rounded md:px-3 transition-colors ${viewMode === 'grid' && !isSplitView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                onClick={() => { setViewMode('grid'); setIsSplitView(false); }}
                title="Grade"
              >
                <FiGrid />
              </button>
              <button
                className={`p-2 rounded md:px-3 transition-colors ${viewMode === 'list' && !isSplitView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                onClick={() => { setViewMode('list'); setIsSplitView(false); }}
                title="Lista"
              >
                <FiList />
              </button>
              <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1 my-1"></div>
              <button
                className={`p-2 rounded md:px-3 transition-colors ${isSplitView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                onClick={() => setIsSplitView(!isSplitView)}
                title="Visualização Dividida"
              >
                <FiColumns />
              </button>
            </div>

            <button className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500 hover:text-indigo-600 hover:border-indigo-500 px-3 py-2.5 rounded-lg transition-all" onClick={() => fetchDocuments()} title="Atualizar">
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative flex gap-6 min-h-0">

        {/* Document List Side */}
        <div className={`transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden ${isSplitView ? 'w-[400px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 pr-4' : 'w-full'}`}>
          {loading ? (
            <div className={viewMode === 'grid' && !isSplitView ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <EmptyState isSearch={!!searchQuery} onUploadClick={() => showAlert('Info', 'Vá para a página de upload', 'info')} />
          ) : (
            <div className={viewMode === 'grid' && !isSplitView ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10' : 'w-full pb-10'}>
              {viewMode === 'grid' && !isSplitView ? (
                filteredDocuments.map(doc => (
                  <DocumentCard key={doc.id} doc={doc} onView={handleDocumentClick} onDownload={downloadDocument} onDelete={deleteDocument} onRemoveWatermark={handleRemoveWatermark} />
                ))
              ) : (

                <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-visible shadow-sm ${isSplitView ? 'border-none shadow-none bg-transparent dark:bg-transparent' : ''}`}>

                  {/* Header da Tabela (Esconder se estiver em Split View) */}
                  {!isSplitView && (
                    <div className="grid grid-cols-[48px_2fr_140px_110px_130px_160px] px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <div className="text-center">#</div>
                      <div>Nome</div>
                      <div>Data</div>
                      <div>Tamanho</div>
                      <div>Status</div>
                      <div className="text-right">Ações</div>
                    </div>
                  )}

                  {filteredDocuments.map(doc => (
                    <DocumentListRow
                      key={doc.id}
                      doc={doc}
                      isActive={isSplitView && selectedDoc?.id === doc.id}
                      isCompact={isSplitView} // <--- AQUI ESTÁ O SEGREDO
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

        {/* Split View Panel */}
        {isSplitView && (
          <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col">
            {selectedDoc ? (
              <>
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">{selectedDoc.filename}</h4>
                  <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-red-500"><FiX size={20} /></button>
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden relative">
                  <PDFPanel doc={selectedDoc} />
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FiColumns size={48} className="mb-4 opacity-50" />
                <p>Selecione um documento para visualizar</p>
              </div>
            )}
          </div>
        )}
      </div>

      {!isSplitView && selectedDoc && <PDFViewerModal doc={selectedDoc} onClose={handleCloseModal} />}
    </div>
  );
};

export default ViewPDFPage;