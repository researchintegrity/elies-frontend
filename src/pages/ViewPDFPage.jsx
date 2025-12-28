// src/pages/ViewPDFPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FiLoader, FiAlertTriangle, FiRefreshCw, FiDownload, FiTrash2,
  FiSearch, FiGrid, FiList, FiFileText, FiEye, FiX,
  FiUploadCloud, FiColumns, FiDroplet, FiCheck
} from 'react-icons/fi';
import { useDocuments } from '../hooks/useDocuments';
import { useWatermarkRemoval } from '../hooks/useWatermarkRemoval';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';
import PDFViewer from '../components/PDFViewer';
import { useLanguage } from '../context/LanguageContext';
import { SkeletonCard, EmptyState } from '../components/common';

// --- Watermark Actions Component ---
const WatermarkActionMenu = ({ doc, onRemoveWatermark, t }) => {
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

  const options = [
    { level: 0, label: t('pdfs.none'), sub: t('pdfs.keepOriginal'), color: 'bg-gray-500', icon: '—' },
    { level: 1, label: t('pdfs.level1'), sub: t('pdfs.level1Sub'), color: 'bg-emerald-500', icon: '1' },
    { level: 2, label: t('pdfs.level2'), sub: t('pdfs.level2Sub'), color: 'bg-amber-500', icon: '2' },
    { level: 3, label: t('pdfs.level3'), sub: t('pdfs.level3Sub'), color: 'bg-red-500', icon: '3' }
  ];

  return (
    <div className="relative flex-shrink-0" ref={menuRef} onClick={e => e.stopPropagation()}>
      <button
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border ${isOpen
          ? 'bg-amber-100 border-amber-500 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
          : 'bg-transparent border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-amber-500 hover:border-amber-500 dark:hover:text-amber-400'
          }`}
        onClick={() => setIsOpen(!isOpen)}
        title={t('pdfs.watermarkOptions')}
      >
        <FiDroplet className="text-lg" />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 min-w-[280px] z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-2 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <FiDroplet className="text-amber-500" />
            {t('pdfs.removeWatermark')}
          </div>

          <div className="flex flex-col gap-1">
            {options.map((option) => (
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
const PDFPanel = ({ doc, t }) => {
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
          setError(t('pdfs.loadError'));
          setLoading(false);
        }
      }
    };
    if (doc) fetchPdf();
    return () => {
      isMounted = false;
    };
  }, [doc, t, pdfBlobUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4 text-gray-500 dark:text-gray-400">
        <FiLoader className="text-4xl animate-spin text-indigo-500" />
        <p className="font-medium">{t('pdfs.loadingDoc')}</p>
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
const PDFViewerModal = ({ doc, onClose, locale }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const { t } = useLanguage();

  if (!doc) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/90 flex items-center justify-center z-[2000] backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full h-full max-w-[1600px] max-h-[95vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{doc.filename}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(doc.uploadedDate).toLocaleDateString(locale)} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
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
          <PDFPanel doc={doc} t={t} />
        </div>
      </div>
    </div>
  );
};

// --- Card Component ---
const DocumentCard = ({ doc, onView, onDownload, onDelete, onRemoveWatermark, t }) => {
  return (
    <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-500/50 flex flex-col hover:z-20">
      <div
        className="relative w-full pt-[65%] bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer rounded-t-xl overflow-hidden"
        onClick={() => onView(doc)}
      >
        <FiFileText className="absolute text-6xl text-gray-300 dark:text-gray-700 transition-transform duration-300 group-hover:scale-110 group-hover:text-indigo-400/50" />

        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
          <button className="p-3 rounded-full bg-white/20 hover:bg-indigo-600 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10" onClick={(e) => { e.stopPropagation(); onView(doc); }} title={t('pdfs.view')}>
            <FiEye className="text-xl" />
          </button>
          <button className="p-3 rounded-full bg-white/20 hover:bg-emerald-600 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10" onClick={(e) => { e.stopPropagation(); onDownload(doc); }} title={t('pdfs.download')}>
            <FiDownload className="text-xl" />
          </button>
          <button className="p-3 rounded-full bg-white/20 hover:bg-red-600 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10" onClick={(e) => { e.stopPropagation(); onDelete(doc); }} title={t('pdfs.delete')}>
            <FiTrash2 className="text-xl" />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3 relative">
        <div className="flex justify-between items-start gap-3 relative z-10">
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate flex-1" title={doc.filename}>
            {doc.filename}
          </h4>
          <WatermarkActionMenu doc={doc} onRemoveWatermark={onRemoveWatermark} t={t} />
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
            {doc.extractionStatus === 'completed' ? t('pdfs.complete') : doc.extractionStatus === 'processing' ? t('pdfs.processing') : t('pdfs.waiting')}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- List Row Component ---
const DocumentListRow = ({ doc, onView, onDownload, onDelete, onRemoveWatermark, isActive, isCompact, t }) => {
  return (
    <div
      className={`group grid items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer
      ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500 pl-[calc(1rem-4px)]' : 'border-l-4 border-l-transparent'}
      ${isCompact
          ? 'grid-cols-[auto_1fr_auto] gap-3'
          : 'grid-cols-[48px_2fr_140px_110px_130px_160px] gap-4'
        }`}
    >
      <div className={`text-gray-400 group-hover:text-indigo-500 flex justify-center ${isCompact ? 'text-xl' : 'text-2xl'}`} onClick={() => onView(doc)}>
        <FiFileText />
      </div>

      <div className="truncate pr-2 overflow-hidden" onClick={() => onView(doc)}>
        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate" title={doc.filename}>
          {doc.filename}
        </span>
        {isCompact && (
          <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
            {new Date(doc.uploadedDate).toLocaleDateString()} • {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
          </span>
        )}
      </div>

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
              {doc.extractionStatus === 'completed' ? t('pdfs.complete') : doc.extractionStatus === 'processing' ? t('pdfs.processing') : t('pdfs.waiting')}
            </span>
          </div>
        </>
      )}

      <div className={`flex items-center justify-end ${isCompact ? 'gap-1' : 'gap-2 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
        <WatermarkActionMenu doc={doc} onRemoveWatermark={onRemoveWatermark} t={t} />
        {!isCompact && (
          <button className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" onClick={() => onView(doc)} title={t('pdfs.view')}><FiEye /></button>
        )}
        <button className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" onClick={() => onDownload(doc)} title={t('pdfs.download')}><FiDownload /></button>
        <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" onClick={() => onDelete(doc)} title={t('pdfs.delete')}><FiTrash2 /></button>
      </div>
    </div>
  );
};

// --- Main Page Component ---
const ViewPDFPage = () => {
  const { documents, loading, fetchDocuments, deleteDocument, downloadDocument } = useDocuments();
  const { t, locale } = useLanguage();
  const [viewMode, setViewMode] = useState('grid');
  const [isSplitView, setIsSplitView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { removeWatermark } = useWatermarkRemoval(() => {
    fetchDocuments();
  });

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

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
    <div className="w-full h-full flex flex-col p-6 md:p-8 overflow-hidden relative text-gray-900 dark:text-gray-100 transition-colors duration-300">

      {/* Header & Toolbar */}
      <header className="flex flex-wrap justify-between items-center mb-6 md:mb-8 gap-4 pb-4 md:pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">{t('pdfs.title')}</h2>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
            {loading ? t('common.loading') : `${filteredDocuments.length} ${t('pdfs.documentsFound')}`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 flex-1 justify-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[120px] max-w-xs group">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 md:py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400 text-sm"
              placeholder={t('pdfs.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 md:py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">{t('pdfs.sortNewest')}</option>
              <option value="oldest">{t('pdfs.sortOldest')}</option>
              <option value="name_asc">A-Z</option>
              <option value="name_desc">Z-A</option>
              <option value="size_desc">{t('pdfs.sortSize')}</option>
            </select>

            <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
              <button
                className={`p-2 rounded md:px-3 transition-colors ${viewMode === 'grid' && !isSplitView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                onClick={() => { setViewMode('grid'); setIsSplitView(false); }}
                title={t('pdfs.grid')}
              >
                <FiGrid />
              </button>
              <button
                className={`p-2 rounded md:px-3 transition-colors ${viewMode === 'list' && !isSplitView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                onClick={() => { setViewMode('list'); setIsSplitView(false); }}
                title={t('pdfs.list')}
              >
                <FiList />
              </button>
              <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1 my-1"></div>
              <button
                className={`p-2 rounded md:px-3 transition-colors ${isSplitView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                onClick={() => setIsSplitView(!isSplitView)}
                title={t('pdfs.splitView')}
              >
                <FiColumns />
              </button>
            </div>

            <button className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500 hover:text-indigo-600 hover:border-indigo-500 p-2 md:px-3 md:py-2.5 rounded-lg transition-all" onClick={() => fetchDocuments()} title={t('common.update')}>
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
            <EmptyState
              title={searchQuery ? t('pdfs.noDocFound') : t('pdfs.empty')}
              description={searchQuery ? t('pdfs.searchNoResults') : t('pdfs.emptyDescription')}
              icon="document"
              actionLabel={!searchQuery ? t('pdfs.uploadNow') : undefined}
              onAction={!searchQuery ? () => showAlert('Info', t('pdfs.goToUpload'), 'info') : undefined}
              showAction={!searchQuery}
            />
          ) : (
            <div className={viewMode === 'grid' && !isSplitView ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10' : 'w-full pb-10'}>
              {viewMode === 'grid' && !isSplitView ? (
                filteredDocuments.map(doc => (
                  <DocumentCard key={doc.id} doc={doc} onView={handleDocumentClick} onDownload={downloadDocument} onDelete={deleteDocument} onRemoveWatermark={removeWatermark} t={t} />
                ))
              ) : (

                <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-visible shadow-sm ${isSplitView ? 'border-none shadow-none bg-transparent dark:bg-transparent' : ''}`}>

                  {!isSplitView && (
                    <div className="grid grid-cols-[48px_2fr_140px_110px_130px_160px] px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <div className="text-center">#</div>
                      <div>{t('pdfs.name')}</div>
                      <div>{t('pdfs.date')}</div>
                      <div>{t('pdfs.size')}</div>
                      <div>{t('pdfs.status')}</div>
                      <div className="text-right">{t('pdfs.actions')}</div>
                    </div>
                  )}

                  {filteredDocuments.map(doc => (
                    <DocumentListRow
                      key={doc.id}
                      doc={doc}
                      isActive={isSplitView && selectedDoc?.id === doc.id}
                      isCompact={isSplitView}
                      onView={handleDocumentClick}
                      onDownload={downloadDocument}
                      onDelete={deleteDocument}
                      onRemoveWatermark={removeWatermark}
                      t={t}
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
                  <PDFPanel doc={selectedDoc} t={t} />
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FiColumns size={48} className="mb-4 opacity-50" />
                <p>{t('pdfs.selectDocToView')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {!isSplitView && selectedDoc && <PDFViewerModal doc={selectedDoc} onClose={handleCloseModal} locale={locale} />}
    </div>
  );
};

export default ViewPDFPage;