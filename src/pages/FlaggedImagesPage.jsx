/**
 * Flagged Images Page - Investigation Workspace
 * 
 * A dedicated page for in-depth analysis of flagged suspicious images.
 * Features split-view layout with image list + detail panel for annotations,
 * analysis history, and related images.
 * 
 * ELIS Scientific Integrity Platform
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiFilter,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiAlertTriangle,
  FiRefreshCw,
  FiFlag,
  FiTag,
  FiImage
} from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import { useImages } from '../hooks/useImages';
import { api } from '../services/api';
import { API_BASE_URL } from '../config/api';

// Extracted Components
import SelectionToolbar from '../components/SelectionToolbar';
import BatchTagModal from '../components/BatchTagModal';
import LightboxModal from '../components/common/LightboxModal';
import ImageMetadataSidebar from '../components/common/ImageMetadataSidebar';
import { EmptyState } from '../components/common';
import FlaggedImageRow from '../components/flagged/FlaggedImageRow';
import QueryImageThumbnail from '../components/flagged/QueryImageThumbnail';
import SimilarityResultCard from '../components/flagged/SimilarityResultCard';
import FlaggedImageDetailPanel from '../components/flagged/FlaggedImageDetailPanel';

// Hooks
import { usePanelExtraction } from '../hooks/usePanelExtraction';
import { useFlaggedImages } from '../hooks/useFlaggedImages';
import { useSimilaritySearch } from '../hooks/useSimilaritySearch';
import { showToast, showConfirm, showAlert } from '../utils/alert';

const IMAGES_PER_PAGE = 24;

const FlaggedImagesPage = ({ onNavigate }) => {
  const { t, locale } = useLanguage();
  const { toggleFlag, deleteImage, addImageTypes, removeImageType } = useImages();

  // Custom Hooks
  const {
    images: flaggedImages,
    setImages: setFlaggedImages, // Local update need, though ideally refetch
    loading,
    error,
    pagination,
    currentPage,
    setPage,
    refetch: fetchFlaggedImages,
    filters
  } = useFlaggedImages();

  const similarity = useSimilaritySearch(t);

  // Panel extraction
  const {
    isExtracting,
    startExtraction,
    status: extractionStatus
  } = usePanelExtraction();

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isGalleryMinimized, setIsGalleryMinimized] = useState(false);

  // Selection State
  const [selectedImages, setSelectedImages] = useState(new Map());
  const selectedIds = useMemo(() => new Set(selectedImages.keys()), [selectedImages]);
  const [lastClickedId, setLastClickedId] = useState(null);
  const [lastActionWasSelect, setLastActionWasSelect] = useState(true);

  // Modals
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);
  const [isBatchTagModalOpen, setIsBatchTagModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Fetch tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await api.get('/images/tags');
        setAvailableTags(tags);
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, []);

  // Auto-select first image
  useEffect(() => {
    if (flaggedImages.length > 0 && !selectedImage) {
      setSelectedImage(flaggedImages[0]);
    }
  }, [flaggedImages, selectedImage]);

  // Refresh when extraction completes
  useEffect(() => {
    if (extractionStatus === 'completed') {
      fetchFlaggedImages();
    }
  }, [extractionStatus, fetchFlaggedImages]);

  // All similarity images (for selection purposes)
  const allSimilarityImages = useMemo(() => {
    if (!similarity.isActive) return [];
    const flaggedIds = new Set(flaggedImages.map(img => img.id));
    return similarity.results.map(result => ({
      id: result.image_id,
      imageId: result.image_id,
      filename: result.filename || t('image.noName') || 'Unknown',
      uploadedDate: result.uploaded_date || new Date().toISOString(),
      fileSize: result.file_size || 0,
      sourceType: result.source_type || 'unknown',
      imageType: result.image_type || [],
      similarityScore: result.similarity_score,
      isFlagged: flaggedIds.has(result.image_id) || result.is_flagged || false
    }));
  }, [similarity.isActive, similarity.results, flaggedImages, t]);

  // Filter images (client side filter for similarity only, otherwise handled by hook)
  const filteredImages = useMemo(() => {
    if (similarity.isActive) {
      // Map paginated results to full image objects
      const pageResults = similarity.paginatedResults;
      const flaggedIds = new Set(flaggedImages.map(img => img.id));

      return pageResults.map(result => ({
        id: result.image_id,
        imageId: result.image_id,
        filename: result.filename || t('image.noName') || 'Unknown',
        uploadedDate: result.uploaded_date || new Date().toISOString(),
        fileSize: result.file_size || 0,
        sourceType: result.source_type || 'unknown',
        imageType: result.image_type || [],
        similarityScore: result.similarity_score,
        isFlagged: flaggedIds.has(result.image_id) || result.is_flagged || false
      }));
    }
    return flaggedImages;
  }, [flaggedImages, similarity.isActive, similarity.paginatedResults, t]);

  // Handlers
  const handleImageClick = useCallback((image) => {
    setSelectedImage(image);
    setIsGalleryMinimized(true);
  }, []);

  const handleSelect = useCallback((id, event, imageDataParam) => {
    const imageData = imageDataParam ||
      flaggedImages.find(img => img.id === id) ||
      allSimilarityImages.find(img => img.id === id) ||
      (selectedImage?.id === id ? selectedImage : null);

    // Shift-click range support
    if (event?.shiftKey && lastClickedId && lastClickedId !== id) {
      const visibleImages = similarity.isActive ? allSimilarityImages : flaggedImages;
      const lastIndex = visibleImages.findIndex(img => img.id === lastClickedId);
      const currentIndex = visibleImages.findIndex(img => img.id === id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex);
        const endIndex = Math.max(lastIndex, currentIndex);
        const rangeImages = visibleImages.slice(startIndex, endIndex + 1);

        setSelectedImages(prev => {
          const newMap = new Map(prev);
          if (lastActionWasSelect) {
            rangeImages.forEach(img => newMap.set(img.id, img));
          } else {
            rangeImages.forEach(img => newMap.delete(img.id));
          }
          return newMap;
        });

        setLastActionWasSelect(!lastActionWasSelect);
        return;
      }
    }

    const wasSelected = selectedIds.has(id);
    setSelectedImages(prev => {
      const newMap = new Map(prev);
      if (newMap.has(id)) {
        newMap.delete(id);
      } else {
        const imgToAdd = imageData || { id: id, imageId: id, filename: `Image ${id.slice(-8)}` };
        newMap.set(id, {
          id: id,
          imageId: imgToAdd.imageId || imgToAdd.image_id || id,
          filename: imgToAdd.filename || `Image ${id.slice(-8)}`,
          sourceType: imgToAdd.sourceType || imgToAdd.source_type,
          imageType: imgToAdd.imageType || imgToAdd.image_type || []
        });
      }
      return newMap;
    });

    setLastClickedId(id);
    setLastActionWasSelect(!wasSelected);
  }, [flaggedImages, allSimilarityImages, selectedImage, lastClickedId, selectedIds, lastActionWasSelect, similarity.isActive]);

  const handleUnflag = async (image) => {
    try {
      await toggleFlag(image);
      setFlaggedImages(prev => prev.filter(img => img.id !== image.id));
      if (selectedImage?.id === image.id) {
        const remaining = flaggedImages.filter(img => img.id !== image.id);
        setSelectedImage(remaining.length > 0 ? remaining[0] : null);
      }
      setSelectedImages(prev => {
        const newMap = new Map(prev);
        newMap.delete(image.id);
        return newMap;
      });
    } catch (err) {
      console.error('Error unflagging image:', err);
    }
  };

  const handleAddTag = async (image, tag) => {
    const success = await addImageTypes(image, tag);
    if (success) {
      if (selectedImage && selectedImage.id === image.id) {
        const newTags = Array.isArray(tag) ? tag : [tag];
        setSelectedImage(prev => ({
          ...prev,
          imageType: [...new Set([...(prev.imageType || []), ...newTags])]
        }));
      }
      fetchFlaggedImages();
    }
  };

  const handleRemoveTag = async (image, tag) => {
    const success = await removeImageType(image, tag);
    if (success) {
      if (selectedImage && selectedImage.id === image.id) {
        setSelectedImage(prev => ({
          ...prev,
          imageType: (prev.imageType || []).filter(t => t !== tag)
        }));
      }
      fetchFlaggedImages();
    }
  };

  const handleClearSelection = useCallback(() => {
    setSelectedImages(new Map());
    setLastClickedId(null);
  }, []);

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const selectedArray = Array.from(selectedImages.values());
    const uploadedImages = selectedArray.filter(img => img.sourceType !== 'extracted');
    const extractedCount = selectedArray.length - uploadedImages.length;

    if (uploadedImages.length === 0) {
      showAlert(t('batch.actionBlocked'), t('batch.extractedOnlyMessage')?.replace('{count}', extractedCount) || `${extractedCount} extracted images cannot be deleted`, 'warning');
      return;
    }

    let confirmMessage = (t('batch.confirmDelete') || 'Delete {count} images?').replace('{count}', uploadedImages.length);
    if (extractedCount > 0) confirmMessage += `\n\n${(t('batch.confirmDeleteNote') || '{count} extracted images will be skipped').replace('{count}', extractedCount)}`;

    if (await showConfirm(t('batch.confirmation') || 'Confirm', confirmMessage)) {
      let successCount = 0;
      handleClearSelection();
      for (const img of uploadedImages) {
        if (await deleteImage(img, { skipConfirm: true })) successCount++;
      }
      if (successCount > 0) {
        showToast(`${successCount} ${t('batch.imagesDeleted') || 'images deleted'}`, 'success');
        fetchFlaggedImages();
      }
    }
  };

  const handleBatchTagConfirm = async (newTags) => {
    if (newTags.length === 0) return;
    const selectedArray = Array.from(selectedImages.values());
    let successCount = 0;
    for (const img of selectedArray) {
      await addImageTypes(img, newTags);
      successCount++;
    }
    showToast(`${newTags.length} ${t('batch.tagsAdded') || 'tags added to'} ${successCount} ${t('batch.images') || 'images'}`);
    handleClearSelection();
  };

  const handleAnalyzeSelected = useCallback((analysisType) => {
    const selectedArray = Array.from(selectedImages.values());
    if (selectedArray.length === 0) return;

    if (analysisType === 'copyMoveCross' && selectedArray.length !== 2) {
      showToast(t('analyze.selectTwoImages') || 'Select exactly 2 images for cross copy-move', 'warning');
      return;
    }

    const mapping = {
      'imageAnalysis': 'imageAnalysis',
      'manipulationDetection': 'manipulationDetection',
      'copyMove': 'copyMove',
      'copyMoveSingle': 'copyMove',
      'provenance': 'provenance',
      'batchManipulation': 'manipulationDetection',
      'batchCopyMove': 'copyMove'
    };

    let mode = 'single';
    if (analysisType === 'copyMoveCross') mode = 'cross';
    else if (analysisType === 'batchManipulation' || analysisType === 'batchCopyMove') mode = 'batch';

    const startAnalysisData = {
      imageIds: selectedArray.map(img => img.imageId || img.id),
      targetPage: mapping[analysisType] || analysisType,
      mode: mode
    };

    sessionStorage.setItem('startAnalysis', JSON.stringify(startAnalysisData));
    showToast(t('analyze.navigatingToTool') || 'Navigating to analysis tool...', 'success');

    if (onNavigate) onNavigate(startAnalysisData.targetPage);
    else window.location.reload();
  }, [selectedImages, t, onNavigate]);

  const handleFindSimilar = useCallback(() => {
    if (selectedImages.size !== 1) {
      showToast(t('similarity.selectOneImage') || 'Select exactly 1 image to find similar', 'warning');
      return;
    }
    const queryImage = Array.from(selectedImages.values())[0];
    if (queryImage) similarity.search(queryImage);
  }, [selectedImages, similarity, t]);

  const handleViewMetadata = useCallback(async () => {
    if (selectedImages.size !== 1) return;
    const selectedImg = Array.from(selectedImages.values())[0];
    if (!selectedImg) return;
    try {
      const blob = await api.download(`/images/${selectedImg.imageId || selectedImg.id}/download`);
      setLightboxImage(selectedImg);
      setLightboxUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error('Error loading image for metadata view:', err);
      showToast(t('image.loadError') || 'Error loading image', 'error');
    }
  }, [selectedImages, t]);

  const handleExtractPanels = useCallback(async () => {
    if (selectedImages.size === 0) return;
    const imageIds = Array.from(selectedImages.keys());
    const result = await startExtraction(imageIds);
    if (result.success) handleClearSelection();
  }, [selectedImages, startExtraction, handleClearSelection]);

  const handleExitSimilarityMode = useCallback(() => {
    similarity.exit();
    handleClearSelection();
  }, [similarity, handleClearSelection]);

  // ESC Key Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit'].includes(e.target.type))) return;
      if (e.key === 'Escape') {
        if (lightboxImage) setLightboxImage(null);
        else if (isBatchTagModalOpen) setIsBatchTagModalOpen(false);
        else if (annotationModalOpen) setAnnotationModalOpen(false);
        else if (selectedIds.size > 0) handleClearSelection();
        else if (selectedImage) {
          setSelectedImage(null);
          setIsGalleryMinimized(false);
        }
        else if (similarity.isActive) handleExitSimilarityMode();
        else if (filters.hasActive || filters.searchQuery) filters.clear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, isBatchTagModalOpen, annotationModalOpen, selectedIds, selectedImage, similarity.isActive, filters, handleClearSelection, handleExitSimilarityMode]);


  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      {/* Modals */}
      <BatchTagModal isOpen={isBatchTagModalOpen} onClose={() => setIsBatchTagModalOpen(false)} onConfirm={handleBatchTagConfirm} count={selectedIds.size} />
      <LightboxModal isOpen={!!lightboxImage} imageUrl={lightboxUrl} onClose={() => { setLightboxImage(null); setLightboxUrl(null); }} title={lightboxImage?.filename}>
        <ImageMetadataSidebar image={lightboxImage} t={t} locale={locale} onTagAdd={handleAddTag} onTagRemove={handleRemoveTag} />
      </LightboxModal>

      {/* Floating Toolbar */}
      <SelectionToolbar
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
        onDelete={handleDeleteSelected}
        onTag={() => setIsBatchTagModalOpen(true)}
        onAnalyze={handleAnalyzeSelected}
        onFindSimilar={!similarity.isActive ? handleFindSimilar : undefined}
        onViewMetadata={handleViewMetadata}
        onExtractPanels={handleExtractPanels}
        isExtracting={isExtracting}
      />

      {/* Similarity Mode Header */}
      {similarity.isActive && (
        <div className="flex-none px-4 sm:px-6 py-4 border-b border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 z-30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {similarity.queryImage && (
                <QueryImageThumbnail
                  image={similarity.queryImage}
                  isSelected={selectedIds.has(similarity.queryImage.imageId || similarity.queryImage.id)}
                  isSelectionMode={selectedIds.size > 0}
                  onSelect={handleSelect}
                />
              )}
              <div>
                <h3 className="text-lg font-bold text-amber-700 flex items-center gap-2"><FiSearch /> {t('similarity.title') || 'Similarity Search'}</h3>
                <p className="text-sm text-amber-600/80 max-w-md truncate">{similarity.queryImage?.filename}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-2 py-1 rounded border dark:border-gray-700 dark:text-gray-200">
                <span className="text-sm">Top-K:</span>
                <input type="range" min="5" max="50" step="5" value={similarity.topK} onChange={e => similarity.setTopK(Number(e.target.value))} />
                <span className="text-sm font-bold">{similarity.topK}</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-2 py-1 rounded border dark:border-gray-700 dark:text-gray-200">
                <span className="text-sm">Threshold:</span>
                <input type="range" min="0" max="1" step="0.05" value={similarity.threshold} onChange={e => similarity.setThreshold(Number(e.target.value))} />
                <span className="text-sm font-bold">{(similarity.threshold * 100).toFixed(0)}%</span>
              </div>
              <button onClick={() => similarity.search(similarity.queryImage)} disabled={similarity.loading} className="px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600">{similarity.loading ? '...' : 'Update'}</button>
              <button onClick={handleExitSimilarityMode} className="px-3 py-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-1"><FiX /> Exit</button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Header */}
      {!similarity.isActive && (
        <header className="flex-none px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 z-30">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-3">
                  <FiFlag className="text-red-500" /> {t('flagged.title') || 'Flagged Images'}
                  {loading && <FiRefreshCw className="animate-spin text-gray-400" />}
                </h2>
              </div>
              {pagination.total > 0 && <span className="px-2 py-0.5 bg-red-50 text-red-700 text-sm font-medium rounded border border-red-200">{pagination.total} flagged</span>}
            </div>
            <div className="flex gap-3">
              <div className="relative group">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="w-48 sm:w-64 pl-10 pr-4 py-2 border rounded-xl outline-none focus:border-red-500"
                  placeholder="Search..."
                  value={filters.searchQuery}
                  onChange={e => filters.setSearchQuery(e.target.value)}
                />
                {filters.searchQuery && <button onClick={() => filters.setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><FiX /></button>}
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-xl border ${showFilters || filters.hasActive ? 'border-red-500 text-red-600 bg-red-50' : 'text-gray-500'}`}><FiFilter /></button>
              <button onClick={fetchFlaggedImages} className="p-2.5 rounded-xl border text-gray-500 hover:text-red-600"><FiRefreshCw /></button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2"><FiTag className="text-gray-400" /><span className="text-xs font-medium text-gray-500">Tag</span>
                <select value={filters.selectedTag} onChange={e => filters.setSelectedTag(e.target.value)} className="text-sm border rounded px-2 py-1">
                  <option value="">All Tags</option>
                  {availableTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2"><span className="text-xs font-medium text-gray-500">From</span><input type="date" value={filters.dateFrom} onChange={e => filters.setDateFrom(e.target.value)} className="text-sm border rounded px-2 py-1" /></div>
              <div className="flex items-center gap-2"><span className="text-xs font-medium text-gray-500">To</span><input type="date" value={filters.dateTo} onChange={e => filters.setDateTo(e.target.value)} className="text-sm border rounded px-2 py-1" /></div>
              {filters.hasActive && <button onClick={filters.clear} className="text-xs text-red-600 font-medium hover:underline">Clear Filters</button>}
            </div>
          )}
        </header>
      )}

      {/* Content Area */}
      {similarity.isActive ? (
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50/50 dark:bg-gray-900/50">
          {similarity.loading ? (
            <div className="flex flex-col items-center justify-center h-64"><FiRefreshCw size={32} className="animate-spin text-amber-500 mb-4" /><p>Searching...</p></div>
          ) : filteredImages.length === 0 ? (
            <EmptyState title="No results" description="Try adjusting threshold" icon="search" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {filteredImages.map(img => (
                <SimilarityResultCard key={img.id} image={img} similarityScore={img.similarityScore} isSelected={selectedIds.has(img.id)} isSelectionMode={selectedIds.size > 0} onSelect={handleSelect} onToggleFlag={toggleFlag} t={t} />
              ))}
            </div>
          )}
          {similarity.totalPages > 1 && (
            <div className="flex justify-center mt-8 pb-8 gap-2">
              <button onClick={() => similarity.setPage(p => Math.max(1, p - 1))} disabled={similarity.page === 1} className="p-2 border rounded"><FiChevronLeft /></button>
              <span>{similarity.page} / {similarity.totalPages}</span>
              <button onClick={() => similarity.setPage(p => Math.min(similarity.totalPages, p + 1))} disabled={similarity.page === similarity.totalPages} className="p-2 border rounded"><FiChevronRight /></button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* List Panel */}
          <div className={`flex-shrink-0 border-r dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900/50 transition-all ${isGalleryMinimized ? 'w-16' : 'w-72'}`}>
            <div className="flex items-center justify-between px-2 py-3 border-b">
              {!isGalleryMinimized && <span className="text-xs font-semibold text-gray-500 uppercase">Images</span>}
              <button onClick={() => setIsGalleryMinimized(!isGalleryMinimized)} className="p-1.5 rounded hover:bg-gray-200 mx-auto">{isGalleryMinimized ? <FiChevronRight /> : <FiChevronLeft />}</button>
              {!isGalleryMinimized && pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(currentPage - 1)} disabled={!pagination.hasPrev} className="p-1 hover:text-gray-700 disabled:opacity-30"><FiChevronLeft /></button>
                  <span className="text-xs">{currentPage}/{pagination.totalPages}</span>
                  <button onClick={() => setPage(currentPage + 1)} disabled={!pagination.hasNext} className="p-1 hover:text-gray-700 disabled:opacity-30"><FiChevronRight /></button>
                </div>
              )}
            </div>
            <div className={`flex-1 overflow-y-auto ${isGalleryMinimized ? 'p-1' : 'p-2 space-y-1'}`}>
              {loading ? (
                [...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-200 animate-pulse rounded mb-1" />)
              ) : error ? (
                <div className="text-center text-red-500 py-4"><FiAlertTriangle className="mx-auto" /><p className="text-xs">Error</p></div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center text-gray-400 py-8"><FiFlag className="mx-auto opacity-50" /><p className="text-sm">No images</p></div>
              ) : (
                filteredImages.map(img => (
                  isGalleryMinimized ? (
                    <button key={img.id} onClick={() => handleImageClick(img)} className={`w-12 h-12 mx-auto block rounded overflow-hidden border-2 ${selectedImage?.id === img.id ? 'border-red-500' : 'border-transparent'}`}>
                      <img src={`${API_BASE_URL}/images/${img.imageId}/thumbnail?token=${localStorage.getItem('authToken')}`} className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <FlaggedImageRow
                      key={img.id}
                      image={img}
                      isActive={selectedImage?.id === img.id}
                      isSelected={selectedIds.has(img.id)}
                      onClick={handleImageClick}
                      onSelect={handleSelect}
                      isSelectionMode={selectedIds.size > 0}
                    />
                  )
                ))
              )}
            </div>
            {!isGalleryMinimized && pagination.totalPages > 1 && (
              <div className="p-3 border-t bg-white dark:bg-gray-800 dark:border-gray-700 flex justify-center gap-2">
                <button onClick={() => setPage(currentPage - 1)} disabled={!pagination.hasPrev} className="px-3 py-1 border dark:border-gray-600 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50">Prev</button>
                <span className="text-xs py-1.5 dark:text-gray-400">{currentPage} / {pagination.totalPages}</span>
                <button onClick={() => setPage(currentPage + 1)} disabled={!pagination.hasNext} className="px-3 py-1 border dark:border-gray-600 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50">Next</button>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="flex-1 min-w-0">
            {selectedImage ? (
              <FlaggedImageDetailPanel
                image={selectedImage}
                onClose={() => { setSelectedImage(null); setIsGalleryMinimized(false); }}
                onUnflag={handleUnflag}
                onNavigate={onNavigate}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                isSelectionMode={selectedIds.size > 0}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                annotationModalOpen={annotationModalOpen}
                setAnnotationModalOpen={setAnnotationModalOpen}
                t={t}
                locale={locale}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FiImage size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select an image</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlaggedImagesPage;
